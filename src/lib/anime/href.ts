/**
 * Canonical anime URL helpers (SEO).
 *
 * Anime detail pages live at `/anime/{id}-{slug}` (e.g.
 * `/anime/140960-jujutsu-kaisen`). The leading digits are the AniList id used
 * for every lookup (metadata fetch, watch route, DB rows); the trailing slug is
 * purely for search engines and humans and is ignored when resolving the id.
 * Bare `/anime/{id}` still resolves — the detail page 301-redirects it to the
 * canonical slug form.
 */

/**
 * Turns an anime title into a URL-safe slug: lowercases, strips diacritics and
 * any non `[a-z0-9]` run into single dashes. Returns `""` for titles with no
 * latin/digit characters (e.g. CJK-only), in which case the URL is just the id.
 */
export function slugifyTitle(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // combining diacritical marks
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Builds the `{id}-{slug}` path segment shared by the anime detail, episodes
 * and watch routes (e.g. `140960-jujutsu-kaisen`). Falls back to the bare id
 * when the title yields an empty slug so the id always resolves.
 */
export function animeSlug(id: string, title?: string | null): string {
  const slug = title ? slugifyTitle(title) : "";
  return slug ? `${id}-${slug}` : id;
}

/**
 * Builds the canonical `/anime/{id}-{slug}` path. Falls back to `/anime/{id}`
 * when the title yields an empty slug so the id always resolves.
 */
export function animeHref(id: string, title?: string | null): string {
  return `/anime/${animeSlug(id, title)}`;
}

/**
 * The detail path for a listed anime, preferring the canonical segment the
 * registry resolved for it.
 *
 * Listings link through here rather than through {@link animeHref} directly:
 * the title a listing's source returned is not always the one the registry
 * claimed, and linking at the derived slug sent every card through the proxy's
 * 308 to the canonical URL. Falls back to deriving from the title when the
 * summary was built without a resolved segment.
 */
export function listedAnimeHref(anime: {
  id: string;
  title?: string | null;
  slug?: string | null;
}): string {
  return anime.slug ? animeHref(anime.slug) : animeHref(anime.id, anime.title);
}

/**
 * The structural kind a season-chain member falls under. Always spelled in
 * English regardless of locale, matching every other structural URL segment
 * (`episode-5`, `-episodes`) — a URL's language is the site's locale prefix,
 * not the words inside it.
 */
export type SeasonSlugKind = "season" | "movie" | "ova" | "special";

/**
 * A season-chain member's own `{id}-{slug}-{kind}-{index}` segment — the same
 * disambiguation the season switcher shows ("Season 2", "Movie 1"), appended
 * after its own title-derived slug so two members that would otherwise share
 * (or nearly share) a slug still resolve to distinct URLs. Safe to append
 * after any slug: every route only ever reads a segment's *leading digits* to
 * resolve the id, so anything after `animeSlug`'s output is purely
 * decorative to routing.
 *
 * Skipped when the title-derived slug already ends in this exact suffix —
 * AniList spells plenty of season entries with the number already in the
 * title ("Attack on Titan Final Season The Final Chapters Special 1"), and
 * appending on top of that would read as "…-special-1-special-1".
 */
export function seasonSlug(
  id: string,
  title: string | null | undefined,
  kind: SeasonSlugKind,
  index: number,
): string {
  const base = animeSlug(id, title);
  const suffix = `${kind}-${index}`;
  return base.endsWith(`-${suffix}`) ? base : `${base}-${suffix}`;
}

/** The `/anime/{id}-{slug}-{kind}-{index}` path for one season-chain member. */
export function seasonAnimeHref(
  id: string,
  title: string | null | undefined,
  kind: SeasonSlugKind,
  index: number,
): string {
  return `/anime/${seasonSlug(id, title, kind, index)}`;
}

/**
 * Builds the canonical watch path,
 * `/watch/{id}-{anime-slug}/episode-{number}` (e.g.
 * `/watch/140960-jujutsu-kaisen/episode-5`), so the player URL is human- and
 * search-engine-readable: the first segment carries the anime name, the second
 * the word "episode" and its number. Only the leading digits of each segment
 * are used to resolve the anime id and episode number; the slug text is ignored.
 */
export function watchHref(
  id: string,
  episodeNumber: number,
  title?: string | null,
): string {
  return `/watch/${animeSlug(id, title)}/episode-${episodeNumber}`;
}

/**
 * Extracts the episode number from a watch route's `[episodeId]` segment.
 * Accepts the canonical `episode-{n}` slug (including a leading anime slug, e.g.
 * `jujutsu-kaisen-episode-5`) and a bare number (`5`). Returns null when no
 * trailing number is present, so the caller can fall back to matching a legacy
 * opaque episode id.
 */
export function parseEpisodeNumber(param: string): number | null {
  const match = /(?:^|episode-)(\d+(?:\.\d+)?)$/.exec(param.trim());
  return match ? Number(match[1]) : null;
}

/**
 * Builds the canonical episodes-list path for an anime,
 * `/anime/{id}-{slug}/episodes`. This is where a season card and the detail
 * page's watch button lead — the full episode grid with infinite scroll.
 */
export function animeEpisodesHref(id: string, title?: string | null): string {
  return `${animeHref(id, title)}/episodes`;
}

/**
 * Extracts the AniList id from an `/anime/[id]` route param that may be a bare
 * id (`"140960"`) or the canonical slug form (`"140960-jujutsu-kaisen"`).
 * Returns the raw param when it has no leading digits so an invalid URL falls
 * through to a 404 rather than silently resolving something else.
 */
export function parseAnimeParam(param: string): string {
  const match = /^(\d+)/.exec(param.trim());
  return match ? match[1] : param.trim();
}

/**
 * Episodes shown per page on the episodes list route. Series longer than this
 * paginate, with the page carried in the URL (`?page=2`) so every page is a
 * distinct, crawlable, shareable address instead of hidden behind scrolling.
 */
export const EPISODES_PAGE_SIZE = 20;

/** How many pages an episode list of `total` episodes spans (at least one). */
export function episodesPageCount(total: number): number {
  return Math.max(1, Math.ceil(total / EPISODES_PAGE_SIZE));
}

/**
 * The URL state an episode list carries: which season of the chain is open,
 * which page of it, in which order, filtered by which term. The detail page
 * uses all four (its list is inline, under the season cards); the episodes
 * route never sets `season`, since its season is the one in its path.
 */
export interface EpisodeListQuery {
  /** Selected season's anime id — omitted for the page's own title. */
  season?: string | null;
  page?: number;
  descending?: boolean;
  query?: string | null;
}

/**
 * Appends the episode-list state to `basePath` (an anime detail path, or an
 * episodes-route path). A param is only added when it changes what is
 * rendered, so the default view of any list keeps exactly one URL.
 */
export function episodeListHref(
  basePath: string,
  options: EpisodeListQuery = {},
): string {
  const params = new URLSearchParams();
  const season = options.season?.trim();
  if (season) params.set("season", season);
  const search = options.query?.trim();
  if (search) params.set("q", search);
  if (options.page && options.page > 1)
    params.set("page", String(options.page));
  if (options.descending) params.set("order", "desc");

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

/**
 * Builds an episodes-list URL for one page, sort order and search term. Page 1
 * of the unfiltered list in ascending order is the bare canonical path.
 */
export function animeEpisodesPageHref(
  id: string,
  title: string | null | undefined,
  options: EpisodeListQuery = {},
): string {
  return episodeListHref(animeEpisodesHref(id, title), options);
}

/**
 * Reads the `?season=` param: the anime id of the season card the viewer
 * opened, or `null` when absent or not an id. The value is only trusted after
 * the caller has matched it against the title's own season chain.
 */
export function parseSeasonParam(
  raw: string | string[] | undefined,
): string | null {
  if (typeof raw !== "string") return null;
  const id = raw.trim();
  return /^\d+$/.test(id) ? id : null;
}

/**
 * Reads the `?page=` param. Returns the requested page number, or `null` when
 * the value is not a plain positive integer (`"abc"`, `"0"`, `"2.5"`, repeated
 * params) so the route can redirect such URLs to the canonical first page
 * rather than rendering duplicate content under a junk address.
 */
export function parseEpisodesPageParam(
  raw: string | string[] | undefined,
): number | null {
  if (raw === undefined) return 1;
  if (typeof raw !== "string" || !/^\d+$/.test(raw)) return null;

  const page = Number.parseInt(raw, 10);
  return page >= 1 ? page : null;
}

/**
 * Longest accepted episode search term. Anything longer is a crawler or a paste
 * accident rather than a query — it is cut instead of getting its own URL.
 */
export const EPISODE_QUERY_MAX_LENGTH = 64;

/**
 * Reads the `?q=` episode filter: whitespace collapsed and length-capped, or
 * `null` when nothing searchable remains (missing, blank or repeated params).
 */
export function parseEpisodesQueryParam(
  raw: string | string[] | undefined,
): string | null {
  const query =
    typeof raw === "string"
      ? raw.replace(/\s+/g, " ").trim().slice(0, EPISODE_QUERY_MAX_LENGTH)
      : "";
  return query.length > 0 ? query : null;
}
