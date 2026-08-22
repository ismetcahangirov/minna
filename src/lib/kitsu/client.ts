import "server-only";

import { CACHE_TTL, cacheGet, cacheKey, cacheSet } from "@/lib/cache";

import type {
  ConsumetAnimeResult,
  ConsumetInfoResponse,
  ConsumetListResponse,
  ConsumetRelation,
} from "@/lib/anime/types";

/**
 * Kitsu catalog gateway — the standby metadata source.
 *
 * The primary source is AniList (via the embedded Consumet provider in
 * `@/lib/consumet/anilist`). AniList's public GraphQL API can go dark for days
 * at a time — as of 2026-08 it answers every request with a 403 "temporarily
 * disabled" — which leaves every listing empty. Kitsu exposes an equivalent
 * catalog over JSON:API with no key, so it backs the same listings whenever
 * AniList is unavailable (see `@/lib/anime/provider`).
 *
 * Everything here is normalized into the permissive `Consumet*` shapes so the
 * existing `toAnimeSummary` / `toAnimeDetail` narrowers and every downstream
 * consumer stay unchanged.
 *
 * Crucially, ids are NOT Kitsu ids: each entry is keyed by its AniList id, read
 * from Kitsu's `mappings` relationship. That keeps `/anime/[id]` routes, cached
 * records, favorites rows and the MegaPlay embed (`ani/{id}/{ep}`) valid across
 * a provider switch — an entry Kitsu cannot map to AniList is dropped rather
 * than given an id the rest of the app cannot resolve.
 */

const KITSU_API = "https://kitsu.io/api/edge";

/** Kitsu rejects `page[limit]` above 20, so larger pages are fetched in chunks. */
const KITSU_MAX_PAGE_SIZE = 20;

/** Kitsu is a fallback — fail fast rather than hold a render open. */
const REQUEST_TIMEOUT_MS = 8_000;

/** Sparse fieldsets: the full anime/category records are ~3x larger for no gain. */
const ANIME_FIELDS = [
  "slug",
  "titles",
  "canonicalTitle",
  "abbreviatedTitles",
  "synopsis",
  "averageRating",
  "startDate",
  "status",
  "subtype",
  "episodeCount",
  "episodeLength",
  "posterImage",
  "coverImage",
  "mappings",
  "categories",
].join(",");

const LIST_QUERY_FIELDS =
  `fields[anime]=${ANIME_FIELDS}` +
  "&fields[categories]=title,slug" +
  "&fields[mappings]=externalSite,externalId";

// --- Raw JSON:API shapes (permissive on purpose) ---------------------------

interface KitsuImage {
  tiny?: string | null;
  small?: string | null;
  medium?: string | null;
  large?: string | null;
  original?: string | null;
}

interface KitsuAnimeAttributes {
  slug?: string | null;
  titles?: Record<string, string | null> | null;
  canonicalTitle?: string | null;
  abbreviatedTitles?: string[] | null;
  synopsis?: string | null;
  description?: string | null;
  averageRating?: string | null;
  startDate?: string | null;
  status?: string | null;
  subtype?: string | null;
  episodeCount?: number | null;
  episodeLength?: number | null;
  posterImage?: KitsuImage | null;
  coverImage?: KitsuImage | null;
}

interface KitsuRelationshipRef {
  id?: string | null;
  type?: string | null;
}

interface KitsuResource<A> {
  id?: string | null;
  type?: string | null;
  attributes?: A | null;
  relationships?: Record<
    string,
    { data?: KitsuRelationshipRef | KitsuRelationshipRef[] | null } | null
  > | null;
}

interface KitsuDocument<D> {
  data?: D | null;
  included?: KitsuResource<Record<string, unknown>>[] | null;
  meta?: { count?: number | null } | null;
}

// --- Transport --------------------------------------------------------------

/**
 * GETs one Kitsu JSON:API document. Throws on a non-2xx response so the caller
 * (`@/lib/anime/provider`) can log it and degrade like any other source failure.
 */
async function kitsuFetch<D>(path: string): Promise<KitsuDocument<D>> {
  const res = await fetch(`${KITSU_API}${path}`, {
    headers: { Accept: "application/vnd.api+json" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    // Listings are Redis-cached by the callers; skip Next's own data cache so a
    // stale fetch cache cannot outlive the Redis TTL.
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Kitsu ${path} responded ${res.status}`);
  }

  return (await res.json()) as KitsuDocument<D>;
}

// --- Field mapping ----------------------------------------------------------

/** AniList-style status token for a Kitsu `status` value. */
function toAniListStatus(status: string | null | undefined): string | null {
  switch (status) {
    case "current":
      return "RELEASING";
    case "finished":
      return "FINISHED";
    case "upcoming":
    case "unreleased":
    case "tba":
      return "NOT_YET_RELEASED";
    default:
      return null;
  }
}

/** AniList-style format token for a Kitsu `subtype` value ("TV", "movie"…). */
function toAniListFormat(subtype: string | null | undefined): string | null {
  if (!subtype) return null;
  const upper = subtype.toUpperCase();
  return upper === "MOVIE" ? "MOVIE" : upper;
}

function pickImage(image: KitsuImage | null | undefined): string | null {
  if (!image) return null;
  return (
    image.large?.trim() ||
    image.original?.trim() ||
    image.medium?.trim() ||
    image.small?.trim() ||
    null
  );
}

/**
 * The banner variant, which prefers `original`.
 *
 * Kitsu's `large` cover is a thumbnail strip — for older entries as small as
 * 390x92 — and the detail hero stretches it over most of a phone screen, an
 * ~8x upscale that looks like a smeared blur. `original` is the full-size
 * artwork; the smaller variants only stand in when it is missing.
 */
function pickCoverImage(image: KitsuImage | null | undefined): string | null {
  if (!image) return null;
  return (
    image.original?.trim() ||
    image.large?.trim() ||
    image.medium?.trim() ||
    image.small?.trim() ||
    null
  );
}

/** Kitsu's `averageRating` is a 0–100 string, the same scale AniList reports. */
function toRating(raw: string | null | undefined): number | null {
  if (typeof raw !== "string") return null;
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? value : null;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Episodes aired so far for a currently-airing title.
 *
 * AniList reports this directly (`currentEpisode`); Kitsu does not, and leaves
 * `episodeCount` null for many airing shows. Both `hasPlayableEpisodes` and the
 * detail page's `ensureEpisodes` key off these counts, so without an estimate
 * every airing title would be dropped from the New listing. Anime air weekly, so
 * elapsed weeks since the premiere is a close approximation; it is capped by the
 * planned episode count when Kitsu knows one, and never applied to a title that
 * is not currently airing.
 */
function estimateAiredEpisodes(
  attributes: KitsuAnimeAttributes,
  nowMs: number,
): number | null {
  if (attributes.status !== "current") return null;

  const startMs = Date.parse(attributes.startDate ?? "");
  if (!Number.isFinite(startMs) || startMs > nowMs) return null;

  const elapsed = Math.floor((nowMs - startMs) / WEEK_MS) + 1;
  const planned = attributes.episodeCount;
  const capped =
    typeof planned === "number" && planned > 0
      ? Math.min(elapsed, planned)
      : elapsed;

  return Math.max(1, capped);
}

/** Indexes an `included` array by `type:id` for relationship resolution. */
function indexIncluded(
  included: KitsuResource<Record<string, unknown>>[] | null | undefined,
): Map<string, KitsuResource<Record<string, unknown>>> {
  const index = new Map<string, KitsuResource<Record<string, unknown>>>();
  for (const entry of included ?? []) {
    if (entry?.type && entry?.id) index.set(`${entry.type}:${entry.id}`, entry);
  }
  return index;
}

/** Resolves one resource's to-many relationship into its included records. */
function relatedResources(
  resource: KitsuResource<unknown>,
  relationship: string,
  type: string,
  index: Map<string, KitsuResource<Record<string, unknown>>>,
): KitsuResource<Record<string, unknown>>[] {
  const data = resource.relationships?.[relationship]?.data;
  if (!Array.isArray(data)) return [];
  return data
    .map((ref) => (ref?.id ? index.get(`${type}:${ref.id}`) : undefined))
    .filter((entry): entry is KitsuResource<Record<string, unknown>> =>
      Boolean(entry),
    );
}

/** Reads an external id (AniList/MyAnimeList) out of a title's mappings. */
function externalId(
  mappings: KitsuResource<Record<string, unknown>>[],
  site: string,
): string | null {
  for (const mapping of mappings) {
    if (mapping.attributes?.externalSite === site) {
      const value = mapping.attributes?.externalId;
      if (typeof value === "string" && value.trim()) return value.trim();
      if (typeof value === "number") return String(value);
    }
  }
  return null;
}

/**
 * Normalizes one Kitsu anime resource into a {@link ConsumetAnimeResult} keyed
 * by its AniList id, or `null` when Kitsu has no AniList mapping for it (its id
 * would be unresolvable everywhere else in the app).
 */
function toConsumetResult(
  resource: KitsuResource<KitsuAnimeAttributes>,
  index: Map<string, KitsuResource<Record<string, unknown>>>,
  nowMs: number,
): ConsumetAnimeResult | null {
  const attributes = resource.attributes;
  if (!attributes) return null;

  const mappings = relatedResources(resource, "mappings", "mappings", index);
  const anilistId = externalId(mappings, "anilist/anime");
  if (!anilistId) return null;

  const malRaw = externalId(mappings, "myanimelist/anime");
  const malId = malRaw ? Number.parseInt(malRaw, 10) : NaN;

  const titles = attributes.titles ?? {};
  const categories = relatedResources(
    resource,
    "categories",
    "categories",
    index,
  );

  return {
    id: anilistId,
    malId: Number.isFinite(malId) ? malId : null,
    title: {
      english: titles.en?.trim() || titles.en_us?.trim() || null,
      romaji: titles.en_jp?.trim() || null,
      native: titles.ja_jp?.trim() || null,
      userPreferred: attributes.canonicalTitle?.trim() || null,
    },
    image: pickImage(attributes.posterImage),
    cover: pickCoverImage(attributes.coverImage),
    description: attributes.synopsis?.trim() || null,
    genres: categories
      .map((category) => category.attributes?.title)
      .filter((title): title is string => typeof title === "string" && !!title),
    rating: toRating(attributes.averageRating),
    type: toAniListFormat(attributes.subtype),
    status: toAniListStatus(attributes.status),
    releaseDate: attributes.startDate ?? null,
    totalEpisodes:
      typeof attributes.episodeCount === "number" && attributes.episodeCount > 0
        ? attributes.episodeCount
        : null,
    currentEpisode: estimateAiredEpisodes(attributes, nowMs),
    color: null,
  };
}

/** Normalizes a whole list document, dropping entries without an AniList id. */
function toConsumetResults(
  doc: KitsuDocument<KitsuResource<KitsuAnimeAttributes>[]>,
): ConsumetAnimeResult[] {
  const index = indexIncluded(doc.included);
  const nowMs = Date.now();
  return (Array.isArray(doc.data) ? doc.data : [])
    .map((resource) => toConsumetResult(resource, index, nowMs))
    .filter((entry): entry is ConsumetAnimeResult => entry !== null);
}

// --- Listing queries --------------------------------------------------------

/**
 * Runs one logical listing page, chunked to Kitsu's 20-item ceiling.
 *
 * `query` carries the filters/sort; offset and limit are appended here. Results
 * are concatenated in order, and `hasNextPage` is derived from the total count
 * Kitsu reports so infinite scroll keeps working.
 */
async function fetchListing(
  query: string,
  page: number,
  perPage: number,
): Promise<ConsumetListResponse> {
  const offset = (page - 1) * perPage;
  const results: ConsumetAnimeResult[] = [];
  let total: number | null = null;

  for (let fetched = 0; fetched < perPage; fetched += KITSU_MAX_PAGE_SIZE) {
    const limit = Math.min(KITSU_MAX_PAGE_SIZE, perPage - fetched);
    const doc = await kitsuFetch<KitsuResource<KitsuAnimeAttributes>[]>(
      `/anime?${query}&include=mappings,categories&${LIST_QUERY_FIELDS}` +
        `&page[limit]=${limit}&page[offset]=${offset + fetched}`,
    );

    if (typeof doc.meta?.count === "number") total = doc.meta.count;

    const batch = toConsumetResults(doc);
    results.push(...batch);

    // A short batch means Kitsu ran out of rows — no point asking for more.
    if (!Array.isArray(doc.data) || doc.data.length < limit) break;
  }

  return {
    currentPage: page,
    hasNextPage: total !== null ? offset + perPage < total : false,
    results,
  };
}

/** Kitsu sort expression for an AniList sort token. */
function toKitsuSort(sort: string[] | undefined): string {
  const token = sort?.[0];
  switch (token) {
    case "SCORE_DESC":
      return "-averageRating";
    case "START_DATE_DESC":
      return "-startDate";
    case "TRENDING_DESC":
    case "POPULARITY_DESC":
    default:
      return "-userCount";
  }
}

/**
 * Kitsu category slugs that do not match the app's AniList-derived genre slugs.
 * An unrecognized `filter[categories]` value is silently ignored by Kitsu — it
 * returns the whole catalog — so unmapped genres must be caught, not guessed.
 */
const KITSU_CATEGORY_SLUGS: Record<string, string> = {
  "mahou-shoujo": "magical-girl",
  "sci-fi": "science-fiction",
};

function toKitsuCategorySlug(genre: string): string {
  const slug = genre
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return KITSU_CATEGORY_SLUGS[slug] ?? slug;
}

export interface KitsuSearchOptions {
  query?: string;
  genres?: string[];
  /** AniList sort tokens, translated by {@link toKitsuSort}. */
  sort?: string[];
  /** AniList status token; only `RELEASING` is currently mapped. */
  status?: string;
  page: number;
  perPage: number;
}

/**
 * The Kitsu equivalent of the AniList `advancedSearch` provider: free-text
 * query, genre facet, sort and airing-status filter in one call.
 */
export function kitsuAdvancedSearch(
  options: KitsuSearchOptions,
): Promise<ConsumetListResponse> {
  const params: string[] = [`sort=${toKitsuSort(options.sort)}`];

  const text = options.query?.trim();
  if (text) params.push(`filter[text]=${encodeURIComponent(text)}`);

  const genres = (options.genres ?? [])
    .map(toKitsuCategorySlug)
    .filter(Boolean);
  if (genres.length > 0) {
    params.push(`filter[categories]=${encodeURIComponent(genres.join(","))}`);
  }

  if (options.status === "RELEASING") params.push("filter[status]=current");

  return fetchListing(params.join("&"), options.page, options.perPage);
}

/** Most-followed titles — Kitsu's stand-in for AniList's popularity ranking. */
export function kitsuPopular(
  page: number,
  perPage: number,
): Promise<ConsumetListResponse> {
  return kitsuAdvancedSearch({ sort: ["POPULARITY_DESC"], page, perPage });
}

/** Currently-airing titles, newest premiere first. */
export function kitsuRecent(
  page: number,
  perPage: number,
): Promise<ConsumetListResponse> {
  return kitsuAdvancedSearch({
    sort: ["START_DATE_DESC"],
    status: "RELEASING",
    page,
    perPage,
  });
}

/**
 * Kitsu's real trending listing (`/trending/anime`).
 *
 * That endpoint ignores `include`, so it yields no mappings — and without a
 * mapping an entry has no AniList id and would be dropped. Its ids are therefore
 * re-fetched through `/anime?filter[id]=…`, which does support includes, and the
 * enriched records are put back into the trending order Kitsu returned (the
 * filtered lookup does not preserve it).
 *
 * `/trending/anime` is a single fixed-size feed with no pagination, so any page
 * past the first falls back to the popularity listing.
 */
export async function kitsuTrending(
  page: number,
  perPage: number,
): Promise<ConsumetListResponse> {
  if (page > 1) return kitsuPopular(page, perPage);

  const trending = await kitsuFetch<KitsuResource<KitsuAnimeAttributes>[]>(
    `/trending/anime?limit=${Math.min(perPage, KITSU_MAX_PAGE_SIZE)}`,
  );

  const order = (Array.isArray(trending.data) ? trending.data : [])
    .map((entry) => entry?.id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  if (order.length === 0)
    return { currentPage: page, hasNextPage: false, results: [] };

  const enriched = await kitsuFetch<KitsuResource<KitsuAnimeAttributes>[]>(
    `/anime?filter[id]=${order.join(",")}&include=mappings,categories&${LIST_QUERY_FIELDS}` +
      `&page[limit]=${Math.min(order.length, KITSU_MAX_PAGE_SIZE)}`,
  );

  const index = indexIncluded(enriched.included);
  const nowMs = Date.now();
  const byKitsuId = new Map<string, ConsumetAnimeResult>();
  for (const resource of Array.isArray(enriched.data) ? enriched.data : []) {
    const result = toConsumetResult(resource, index, nowMs);
    if (result && resource.id) byKitsuId.set(resource.id, result);
  }

  return {
    currentPage: page,
    hasNextPage: false,
    results: order
      .map((id) => byKitsuId.get(id))
      .filter((entry): entry is ConsumetAnimeResult => entry !== undefined),
  };
}

/** Highest-rated titles first. */
export function kitsuTopRated(
  page: number,
  perPage: number,
): Promise<ConsumetListResponse> {
  return kitsuAdvancedSearch({ sort: ["SCORE_DESC"], page, perPage });
}

// --- Relations (season chain) -----------------------------------------------

/**
 * AniList relation token for each Kitsu media-relationship role.
 *
 * The season switcher walks `PREQUEL`/`SEQUEL`; the rest are translated anyway
 * so a Kitsu-sourced record carries the same vocabulary an AniList-sourced one
 * does and nothing downstream has to know which provider produced it.
 */
const RELATION_ROLES: Record<string, string> = {
  prequel: "PREQUEL",
  sequel: "SEQUEL",
  side_story: "SIDE_STORY",
  parent_story: "PARENT",
  full_story: "FULL_STORY",
  summary: "SUMMARY",
  alternative_setting: "ALTERNATIVE",
  alternative_version: "ALTERNATIVE",
  spinoff: "SPIN_OFF",
  adaptation: "ADAPTATION",
  character: "CHARACTER",
  other: "OTHER",
};

/** The relations the season walk actually follows. */
const SEASON_ROLES = new Set(["PREQUEL", "SEQUEL"]);

/** A relation edge resolved far enough to still need its AniList id. */
interface PendingRelation {
  kitsuId: string;
  relationType: string;
  resource: KitsuResource<KitsuAnimeAttributes>;
}

/**
 * Reads a title's `mediaRelationships` edges out of an already-included
 * document, keeping only anime destinations (a manga adaptation is not a
 * season) and ordering prequels/sequels first so the walk still works if the
 * enrichment cap below trims the tail.
 */
function collectRelations(
  resource: KitsuResource<KitsuAnimeAttributes>,
  index: Map<string, KitsuResource<Record<string, unknown>>>,
): PendingRelation[] {
  const edges = relatedResources(
    resource,
    "mediaRelationships",
    "mediaRelationships",
    index,
  );

  const pending: PendingRelation[] = [];
  for (const edge of edges) {
    const role = edge.attributes?.role;
    const relationType =
      typeof role === "string" ? (RELATION_ROLES[role] ?? "OTHER") : "OTHER";

    const ref = edge.relationships?.destination?.data;
    const destination = Array.isArray(ref) ? ref[0] : ref;
    if (destination?.type !== "anime" || !destination.id) continue;

    const target = index.get(`anime:${destination.id}`) as
      KitsuResource<KitsuAnimeAttributes> | undefined;
    if (!target) continue;

    pending.push({ kitsuId: destination.id, relationType, resource: target });
  }

  return pending.sort((a, b) => {
    const aSeason = SEASON_ROLES.has(a.relationType) ? 0 : 1;
    const bSeason = SEASON_ROLES.has(b.relationType) ? 0 : 1;
    return aSeason - bSeason;
  });
}

/**
 * Attaches an AniList id to each relation edge.
 *
 * Kitsu refuses `include=destination.mappings` — `destination` is polymorphic,
 * so it cannot be traversed one level further — which means the edges arrive
 * carrying Kitsu ids only. One batched `filter[id]` lookup (the same trick the
 * trending listing uses) resolves them all at once. Edges Kitsu cannot map to
 * AniList are dropped: the app addresses every anime by AniList id, so a
 * relation without one would link nowhere.
 */
async function resolveRelations(
  pending: PendingRelation[],
): Promise<ConsumetRelation[]> {
  if (pending.length === 0) return [];

  // Kitsu caps a page at 20, which bounds the batch; season roles sort first,
  // so a title with more relations than that keeps the ones the walk needs.
  const batch = pending.slice(0, KITSU_MAX_PAGE_SIZE);

  const doc = await kitsuFetch<KitsuResource<KitsuAnimeAttributes>[]>(
    `/anime?filter[id]=${batch.map((entry) => entry.kitsuId).join(",")}` +
      "&include=mappings&fields[anime]=mappings" +
      "&fields[mappings]=externalSite,externalId" +
      `&page[limit]=${batch.length}`,
  );

  const index = indexIncluded(doc.included);
  const anilistIds = new Map<string, string>();
  for (const entry of Array.isArray(doc.data) ? doc.data : []) {
    if (!entry?.id) continue;
    const anilistId = externalId(
      relatedResources(entry, "mappings", "mappings", index),
      "anilist/anime",
    );
    if (anilistId) anilistIds.set(entry.id, anilistId);
  }

  const relations: ConsumetRelation[] = [];
  for (const entry of batch) {
    const anilistId = anilistIds.get(entry.kitsuId);
    if (!anilistId) continue;

    const attributes = entry.resource.attributes ?? {};
    const titles = attributes.titles ?? {};

    relations.push({
      id: anilistId,
      title: {
        english: titles.en?.trim() || titles.en_us?.trim() || null,
        romaji: titles.en_jp?.trim() || null,
        native: titles.ja_jp?.trim() || null,
        userPreferred: attributes.canonicalTitle?.trim() || null,
      },
      type: toAniListFormat(attributes.subtype),
      image: pickImage(attributes.posterImage),
      relationType: entry.relationType,
    });
  }

  return relations;
}

/**
 * Process-local memo of the AniList → Kitsu id mapping. The mapping never
 * changes, and every Kitsu call starts with it, so remembering it keeps a
 * multi-window episode walk from re-resolving the same anime on every request.
 */
const kitsuIdMemo = new Map<string, string | null>();

/**
 * Resolves an AniList id to Kitsu's own id through the `mappings` index, memoized
 * in-process and in Redis so the lookup costs one request per anime rather than
 * one per call.
 */
async function resolveKitsuId(anilistId: string): Promise<string | null> {
  const memoized = kitsuIdMemo.get(anilistId);
  if (memoized !== undefined) return memoized;

  const key = cacheKey("kitsu", "id", anilistId);
  const cached = await cacheGet<{ id: string | null }>(key);
  if (cached) {
    kitsuIdMemo.set(anilistId, cached.id);
    return cached.id;
  }

  const doc = await kitsuFetch<KitsuResource<Record<string, unknown>>[]>(
    `/mappings?filter[externalSite]=anilist/anime&filter[externalId]=${encodeURIComponent(anilistId)}` +
      "&include=item&page[limit]=1",
  );

  const id =
    (doc.included ?? []).find((entry) => entry?.type === "anime" && entry?.id)
      ?.id ?? null;

  kitsuIdMemo.set(anilistId, id);
  await cacheSet(key, { id }, id ? CACHE_TTL.long : CACHE_TTL.medium);
  return id;
}

/** Sparse fieldset for the season walk: metadata + the relations to traverse. */
const SEASON_NODE_FIELDS =
  `fields[anime]=${ANIME_FIELDS},mediaRelationships` +
  "&fields[mappings]=externalSite,externalId";

/**
 * One node of the season chain, addressed by its **AniList** id: the title's own
 * metadata plus its relations, each already carrying an AniList id.
 *
 * The Kitsu counterpart of `fetchAniListSeasonNode` — deliberately lighter than
 * {@link kitsuAnimeInfo} (no categories, studios or synopsis) because the walk
 * in `@/lib/anime/seasons` only needs each neighbour's title, format, episode
 * count, poster and its own relations to continue.
 */
export async function kitsuSeasonNode(
  anilistId: string,
): Promise<ConsumetInfoResponse | null> {
  const id = anilistId.trim();
  if (!id) return null;

  const kitsuId = await resolveKitsuId(id);
  if (!kitsuId) return null;

  const doc = await kitsuFetch<KitsuResource<KitsuAnimeAttributes>>(
    `/anime/${encodeURIComponent(kitsuId)}` +
      `?include=mappings,mediaRelationships.destination&${SEASON_NODE_FIELDS}`,
  );

  const resource = doc.data;
  if (!resource) return null;

  const index = indexIncluded(doc.included);
  const summary = toConsumetResult(resource, index, Date.now());
  if (!summary) return null;

  return {
    ...summary,
    relations: await resolveRelations(collectRelations(resource, index)),
  };
}

// --- Detail -----------------------------------------------------------------

/** AniList-style season token for a premiere date. */
function toSeason(startDate: string | null | undefined): string | null {
  const month = Number.parseInt((startDate ?? "").slice(5, 7), 10);
  if (!Number.isFinite(month)) return null;
  if (month <= 3) return "WINTER";
  if (month <= 6) return "SPRING";
  if (month <= 9) return "SUMMER";
  return "FALL";
}

/** Studio names from the `animeProductions` join (role `studio`). */
function toStudios(
  resource: KitsuResource<KitsuAnimeAttributes>,
  index: Map<string, KitsuResource<Record<string, unknown>>>,
): string[] {
  return relatedResources(
    resource,
    "animeProductions",
    "animeProductions",
    index,
  )
    .filter((production) => production.attributes?.role === "studio")
    .map((production) => {
      const ref = production.relationships?.producer?.data;
      const id = Array.isArray(ref) ? ref[0]?.id : ref?.id;
      const name = id ? index.get(`producers:${id}`)?.attributes?.name : null;
      return typeof name === "string" ? name : null;
    })
    .filter((name): name is string => Boolean(name));
}

/**
 * Full metadata for one anime, addressed by its **AniList** id.
 *
 * Kitsu is keyed by its own ids, so this is a two-step lookup: the AniList id is
 * resolved to a Kitsu id through the `mappings` index, then that record is read
 * with its categories, mappings, studios and relations. Returns `null` when
 * Kitsu has no entry mapped to the id.
 *
 * No episode list is fetched: on Vercel the streaming scrapers are blocked, so
 * `ensureEpisodes` in `@/lib/anime/detail` synthesizes episodes 1..N from the
 * counts below — exactly as it already does for AniList-sourced records.
 */
export async function kitsuAnimeInfo(
  anilistId: string,
): Promise<ConsumetInfoResponse | null> {
  const id = anilistId.trim();
  if (!id) return null;

  const kitsuId = await resolveKitsuId(id);
  if (!kitsuId) return null;

  const doc = await kitsuFetch<KitsuResource<KitsuAnimeAttributes>>(
    `/anime/${encodeURIComponent(kitsuId)}` +
      "?include=mappings,categories,animeProductions.producer,mediaRelationships.destination",
  );

  const resource = doc.data;
  if (!resource) return null;

  const index = indexIncluded(doc.included);
  const summary = toConsumetResult(resource, index, Date.now());
  if (!summary) return null;

  const attributes = resource.attributes ?? {};

  return {
    ...summary,
    synonyms: Array.isArray(attributes.abbreviatedTitles)
      ? attributes.abbreviatedTitles.filter(
          (title): title is string => typeof title === "string" && !!title,
        )
      : [],
    season: toSeason(attributes.startDate),
    studios: toStudios(resource, index),
    duration:
      typeof attributes.episodeLength === "number" &&
      attributes.episodeLength > 0
        ? attributes.episodeLength
        : null,
    episodes: null,
    relations: await resolveRelations(collectRelations(resource, index)),
  };
}

// --- Episode metadata -------------------------------------------------------

/** One episode's Kitsu-sourced metadata, addressed by its episode number. */
export interface KitsuEpisode {
  number: number;
  title: string | null;
  description: string | null;
  /** Episode still, when Kitsu has one for it. */
  image: string | null;
}

/** Kitsu episode attributes (only the fields the episode cards render). */
interface KitsuEpisodeAttributes {
  number?: number | null;
  canonicalTitle?: string | null;
  titles?: Record<string, string | null> | null;
  synopsis?: string | null;
  thumbnail?: KitsuImage | null;
}

/**
 * A placeholder title Kitsu stores for unnamed episodes ("Episode 5"). The
 * cards already render that label themselves, so such a title carries no
 * information and is dropped rather than duplicated.
 */
function isPlaceholderEpisodeTitle(title: string): boolean {
  return /^(episode|ep\.?)\s*\d+$/i.test(title.trim());
}

/** Preferred episode title: English, then the canonical/romanized fallbacks. */
function pickEpisodeTitle(attributes: KitsuEpisodeAttributes): string | null {
  const titles = attributes.titles ?? {};
  const candidates = [
    titles.en,
    titles.en_us,
    attributes.canonicalTitle,
    titles.en_jp,
  ];

  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (value && !isPlaceholderEpisodeTitle(value)) return value;
  }
  return null;
}

/**
 * Episode titles for one anime, addressed by its **AniList** id and limited to
 * a window of the episode list (`offset` is zero-based, `limit` is capped at
 * Kitsu's per-page maximum).
 *
 * The episodes route renders one page at a time, so only that page's window is
 * fetched — a 1000-episode series never costs 50 round-trips. Entries are keyed
 * by Kitsu's own `number` attribute rather than by their position in the
 * response, so a shifted window still labels the right episodes. Throws like
 * every other Kitsu call; the caller decides how to degrade.
 */
export async function kitsuEpisodes(
  anilistId: string,
  offset: number,
  limit: number,
): Promise<KitsuEpisode[]> {
  const id = anilistId.trim();
  if (!id || limit <= 0) return [];

  const kitsuId = await resolveKitsuId(id);
  if (!kitsuId) return [];

  const doc = await kitsuFetch<KitsuResource<KitsuEpisodeAttributes>[]>(
    `/anime/${encodeURIComponent(kitsuId)}/episodes` +
      `?sort=number&page[offset]=${Math.max(0, Math.trunc(offset))}` +
      `&page[limit]=${Math.min(limit, KITSU_MAX_PAGE_SIZE)}` +
      "&fields[episodes]=number,canonicalTitle,titles,synopsis,thumbnail",
  );

  const resources = Array.isArray(doc.data) ? doc.data : [];

  return resources
    .map((resource) => {
      const attributes = resource?.attributes ?? {};
      const number = attributes.number;
      if (typeof number !== "number" || !Number.isFinite(number)) return null;
      return {
        number,
        title: pickEpisodeTitle(attributes),
        description: attributes.synopsis?.trim() || null,
        image: pickImage(attributes.thumbnail),
      };
    })
    .filter((episode): episode is KitsuEpisode => episode !== null);
}
