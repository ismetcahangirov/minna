import "server-only";

import { canonicalSlugs } from "@/lib/anime/canonical-slug";
import { animeHref, animeSlug, watchHref } from "@/lib/anime/href";
import {
  listAnimeSitemapEntries,
  listEpisodeSitemapEntries,
} from "@/lib/anime/sitemap";
import { locales } from "@/i18n/config";
import { blogPostHref } from "@/lib/blog/href";
import { listBlogSitemapEntries } from "@/lib/blog/queries";
import { listBlogTagSitemapEntries } from "@/lib/blog/tags";
import { cacheGet, cacheKey, cacheSet, getOrSet } from "@/lib/cache";
import { pickDefaultVersion } from "@/lib/seo/hreflang";
import { localeVersions } from "@/lib/seo/locale-alternates";
import { absoluteUrl } from "@/lib/seo/site";
import type { SitemapUrl } from "@/lib/seo/sitemap-xml";

/**
 * The sitemap, split into sections.
 *
 * It used to be one document: 11,010 URLs, 7.8 MB, and 90–110 seconds to
 * produce — long enough that a crawler gives up before the file arrives, which
 * makes every URL in it effectively unlisted. The cost was shared by everything
 * in it, so three blog posts were as expensive to fetch as the entire catalog.
 *
 * Sections make the cost proportional. `pages` touches nothing, `blogs` touches
 * only the database, and the catalog — 99% of the URLs — is chunked so no one
 * request builds all of it. Each section caches its own payload rather than
 * sharing one blob, which also keeps any single value small enough to store.
 */

/** How long one enumeration is reused for. */
const SECTION_TTL = 3600;

/**
 * How long a built catalog is reused for.
 *
 * Longer than {@link SECTION_TTL} because the two sections are not comparable
 * in what a rebuild costs: `blogs` is one database round trip, while the
 * catalog walks every anime and resolves every canonical slug. At an hour, a
 * crawler working through the chunks was rebuilding the whole catalog several
 * times a day — enough Redis commands on its own to exhaust a month's quota,
 * after which every cache read fails and the chunks 404.
 *
 * A day of staleness costs nothing a crawler can observe: an anime added today
 * is listed tomorrow, and the sitemap is refetched far less often than that.
 */
const CATALOG_TTL = 60 * 60 * 24;

/**
 * URLs per catalog chunk. Google's ceiling is 50,000, so this is not about the
 * limit — it is about how much one request has to build before it can answer.
 */
const ANIME_CHUNK_SIZE = 4000;

/** Where the index reads the catalog's chunk count from. */
const CHUNK_COUNT_KEY = cacheKey("sitemap", "anime-chunks", "v1");

/**
 * One entry per locale for a page that exists in all three (I18N-05).
 *
 * Every entry carries the same reciprocal alternates set, because a sitemap
 * alternates block and a page's `hreflang` are read as one claim: listing only
 * the English URL leaves the Turkish and Russian versions with no way in.
 *
 * `x-default` comes from the shared {@link pickDefaultVersion}, the same
 * function the pages use, so the two can never name different defaults.
 */
function perLocale(
  path: string,
  entry: Omit<SitemapUrl, "url" | "alternates">,
): SitemapUrl[] {
  const versions = localeVersions(path);
  const absolute = Object.fromEntries(
    Object.entries(versions).map(([tag, href]) => [tag, absoluteUrl(href)]),
  );
  const alternates = {
    ...absolute,
    "x-default": pickDefaultVersion(absolute),
  };

  return locales.map((locale) => ({
    ...entry,
    url: absoluteUrl(versions[locale]),
    alternates,
  }));
}

/** The publicly crawlable static routes and their crawl hints. */
const STATIC_ROUTES: ReadonlyArray<{
  path: string;
  changeFrequency: SitemapUrl["changeFrequency"];
  priority: number;
}> = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/popular", changeFrequency: "daily", priority: 0.9 },
  { path: "/blogs", changeFrequency: "weekly", priority: 0.7 },
  { path: "/search", changeFrequency: "monthly", priority: 0.5 },
];

/** The static pages. No I/O at all — this section is always instant. */
export function pagesSection(): SitemapUrl[] {
  const now = new Date();
  return STATIC_ROUTES.flatMap((route) =>
    perLocale(route.path, {
      lastModified: now,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    }),
  );
}

/**
 * Blog posts and their tag archives. Database only — no catalog provider is
 * touched, which is what makes a new post crawlable in seconds rather than
 * behind a full walk of the anime feed.
 */
export async function blogsSection(): Promise<SitemapUrl[]> {
  const { posts, tags } = await getOrSet(
    cacheKey("sitemap", "blogs", "v1"),
    SECTION_TTL,
    async () => {
      const [posts, tags] = await Promise.all([
        listBlogSitemapEntries(),
        listBlogTagSitemapEntries(),
      ]);
      return { posts, tags };
    },
  );

  // Every language version of an article, keyed by its translation group, so
  // each sitemap entry carries the same reciprocal set the pages declare.
  // Google reads sitemap alternates and page `hreflang` as one claim and
  // expects them to agree, so both are built from the same rows.
  const versionsByGroup = new Map<string, Record<string, string>>();
  for (const post of posts) {
    const group = versionsByGroup.get(post.translationGroupId) ?? {};
    group[post.language] = absoluteUrl(blogPostHref(post));
    versionsByGroup.set(post.translationGroupId, group);
  }

  const postEntries: SitemapUrl[] = posts.map((post) => {
    const versions = versionsByGroup.get(post.translationGroupId) ?? {};
    // An untranslated post has nothing to alternate with; listing itself alone
    // claims a language choice the reader does not have.
    const alternates =
      Object.keys(versions).length > 1
        ? { ...versions, "x-default": pickDefaultVersion(versions) }
        : undefined;

    return {
      // A post has one URL — its slug under its own language's prefix — so
      // unlike a site page it contributes one entry, not three (I18N-07).
      url: absoluteUrl(blogPostHref(post)),
      lastModified: post.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
      ...(alternates ? { alternates } : {}),
    };
  });

  // Tag archives are hubs, not leaves: a well-stocked one is a better entry
  // point than any single post under it, so its priority tracks how much it
  // covers rather than sitting at a flat default.
  const tagEntries: SitemapUrl[] = tags.flatMap((tag) =>
    perLocale(`/blogs/tag/${tag.slug}`, {
      lastModified: tag.updatedAt,
      changeFrequency: "weekly",
      priority: tag.postCount >= 5 ? 0.6 : 0.4,
    }),
  );

  return [...postEntries, ...tagEntries];
}

/**
 * What one catalog row contributes, reduced to the two fields that build URLs.
 *
 * `id` and `title` are deliberately absent. They exist only to resolve the
 * canonical slug, which happens once at build time — carrying them into the
 * cache would mean paying for them on every read forever. The payload is the
 * cost that matters here: a 143 KB value took 4.6 seconds to read back, while a
 * 1.7 KB value in the same round of measurements took 73 ms.
 */
interface CatalogEntry {
  /** The final `{id}-{slug}` segment, already resolved against the registry. */
  slug: string;
  /** Present on a watch entry; absent on the anime's own detail entry. */
  episodeNumber?: number;
}

/** Cache key for one stored chunk of catalog entries. */
function chunkKey(index: number): string {
  return cacheKey("sitemap", "anime", "chunk", index, "v2");
}

/** A built catalog: its chunk boundaries, and when this process built them. */
interface BuiltCatalog {
  chunks: CatalogEntry[][];
  builtAt: number;
}

/**
 * The last catalog this process built.
 *
 * Redis is the cache; this is the fallback for when Redis cannot answer. A
 * build that could not be stored used to be thrown away and redone by the very
 * next request — which is how a cache outage turned into a rebuild per crawler
 * fetch, each one thousands of commands deep, all of them failing to store.
 */
let builtCatalog: BuiltCatalog | null = null;

/** An in-flight build, so concurrent chunk requests share one walk. */
let catalogBuild: Promise<BuiltCatalog> | null = null;

/** The remembered catalog while it is still within {@link CATALOG_TTL}. */
function freshCatalog(): BuiltCatalog | null {
  if (!builtCatalog) return null;
  const age = Date.now() - builtCatalog.builtAt;
  return age < CATALOG_TTL * 1000 ? builtCatalog : null;
}

/**
 * The catalog, built at most once at a time.
 *
 * Chunks are requested one file at a time but built all at once, so without
 * this a crawler fetching `anime-0` and `anime-1` in parallel starts two full
 * walks that duplicate each other's work and each other's writes.
 */
async function catalogChunks(): Promise<BuiltCatalog> {
  const fresh = freshCatalog();
  if (fresh) return fresh;

  catalogBuild ??= buildCatalogChunks().finally(() => {
    catalogBuild = null;
  });
  return catalogBuild;
}

/**
 * Walks the catalog and stores it as chunks, returning them.
 *
 * Chunking happens here, at write time, rather than when a request slices a
 * shared list. That is the whole point: a chunk request reads one chunk's
 * entries, not the entire catalog's, so its Redis payload is a fraction of the
 * whole and it builds only the URLs it is going to emit.
 *
 * Boundaries are drawn by URL budget rather than by row count, so the files
 * stay evenly sized however the locale set grows.
 *
 * The chunks are returned rather than only counted, so the request that paid
 * for the walk can answer from what it just built instead of reading it back
 * out of the cache it may not have reached.
 */
async function buildCatalogChunks(): Promise<BuiltCatalog> {
  const [anime, episodes] = await Promise.all([
    listAnimeSitemapEntries(),
    listEpisodeSitemapEntries(),
  ]);

  // The URL segment comes from the canonical slug registry, not from the title
  // this enumeration happens to hold — the catalogue feed and the detail record
  // disagree about titles often enough (see `@/lib/anime/canonical-slug`) that a
  // sitemap built from the feed's own title listed URLs the pages then
  // disowned, and which the proxy now redirects. Both enumerations resolve in
  // one registry read.
  const slugs = await canonicalSlugs([
    ...anime.map((entry) => ({ id: entry.id, title: entry.title })),
    ...episodes.map((entry) => ({
      id: entry.animeId,
      title: entry.animeTitle,
    })),
  ]);

  const rows: CatalogEntry[] = [
    ...anime.map((entry) => ({
      slug: slugs.get(entry.id) ?? animeSlug(entry.id, entry.title),
    })),
    ...episodes.map((entry) => ({
      slug:
        slugs.get(entry.animeId) ?? animeSlug(entry.animeId, entry.animeTitle),
      episodeNumber: entry.episodeNumber,
    })),
  ];

  const chunks: CatalogEntry[][] = [];
  let current: CatalogEntry[] = [];
  let budget = 0;

  for (const row of rows) {
    budget += urlsPerRow();
    current.push(row);
    if (budget >= ANIME_CHUNK_SIZE) {
      chunks.push(current);
      current = [];
      budget = 0;
    }
  }
  if (current.length > 0) chunks.push(current);
  if (chunks.length === 0) chunks.push([]);

  const built: BuiltCatalog = { chunks, builtAt: Date.now() };
  builtCatalog = built;

  await Promise.all([
    ...chunks.map((entries, index) =>
      cacheSet(chunkKey(index), entries, CATALOG_TTL),
    ),
    cacheSet(CHUNK_COUNT_KEY, chunks.length, CATALOG_TTL),
  ]);

  return built;
}

/** How many URLs one row expands into, across all three locales. */
function urlsPerRow(): number {
  return locales.length;
}

/** Expands stored entries into the URLs one chunk emits. */
function catalogUrls(entries: CatalogEntry[]): SitemapUrl[] {
  const now = new Date();
  const urls: SitemapUrl[] = [];

  for (const entry of entries) {
    // A watch entry carries an episode number and nothing else to expand.
    if (entry.episodeNumber !== undefined) {
      urls.push(
        ...perLocale(watchHref(entry.slug, entry.episodeNumber), {
          lastModified: now,
          changeFrequency: "weekly",
          priority: 0.7,
        }),
      );
      continue;
    }

    // `entry.slug` is already the final `{id}-{slug}` segment, so the href
    // builders take it in place of the id and are given no title to slugify —
    // that decision was made once, in the registry.
    // The detail page is the only listing URL an anime has: its episode list is
    // rendered inline there, and `/anime/[id]/episodes` — which used to carry
    // that list across `?page=` URLs — now canonicalises to it. Listing both
    // would advertise the same episodes twice, which is what Search Console
    // reports as a duplicate. The per-episode watch pages, listed above, still
    // carry every episode into the index on a URL of its own.
    urls.push(
      ...perLocale(animeHref(entry.slug), {
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.8,
      }),
    );
  }

  return urls;
}

/**
 * One chunk of the catalog.
 *
 * Reads that chunk's stored entries; a miss rebuilds every chunk, because the
 * boundaries are only meaningful as a set — rebuilding one in isolation would
 * leave it overlapping whatever the others still hold.
 */
export async function animeChunk(
  index: number,
): Promise<{ urls: SitemapUrl[]; chunkCount: number } | null> {
  if (index < 0 || !Number.isSafeInteger(index)) return null;

  // What this process last built outranks the cache: it is the same data, it
  // is free to read, and it is the only copy that exists when Redis is down.
  const fresh = freshCatalog();
  if (fresh) return fromCatalog(fresh, index);

  // Range is checked against the known count first, so an out-of-range request
  // is refused for the price of one small read. Without this, a crawler holding
  // a stale index — or anything probing `anime-99.xml` — would trigger a full
  // catalog walk just to be told the chunk does not exist.
  const known = await cachedChunkCount();
  if (known !== null && index >= known) return null;

  const cached = await cacheGet<CatalogEntry[]>(chunkKey(index));
  if (cached) return { urls: catalogUrls(cached), chunkCount: known ?? 1 };

  // Either nothing is cached yet or this chunk expired out from under a set
  // that is still partly warm. Answer from the walk itself — the previous
  // version read the chunk back out of Redis, so a cache that could not be
  // written (an exhausted request quota, say) turned a catalog this request had
  // already built into a 404, and unlisted every anime URL on the site.
  return fromCatalog(await catalogChunks(), index);
}

/** One chunk of a built catalog, or null when the index is past its end. */
function fromCatalog(
  catalog: BuiltCatalog,
  index: number,
): { urls: SitemapUrl[]; chunkCount: number } | null {
  const entries = catalog.chunks[index];
  if (!entries) return null;
  return { urls: catalogUrls(entries), chunkCount: catalog.chunks.length };
}

/**
 * How many catalog chunks the index should list.
 *
 * Reads this process's own build when it has one, then the count a previous
 * chunk build left behind — one small Redis GET, which is what keeps the index
 * instant. Falls back to a single chunk when neither can answer: the crawler
 * fetches `anime-0`, that fetch builds the catalog and publishes the real
 * count, and the next index read lists the rest. One crawl cycle behind at
 * worst, and only on a cold process with a cold cache.
 */
export async function animeChunkCount(): Promise<number> {
  return freshCatalog()?.chunks.length ?? (await cachedChunkCount()) ?? 1;
}

/**
 * The stored chunk count, or `null` when nothing has built one yet.
 *
 * Distinct from {@link animeChunkCount} because the two callers need different
 * answers to a cold cache: the index has to print *something*, while a chunk
 * request has to tell "out of range" apart from "not built yet" — one is a 404,
 * the other is a rebuild.
 */
async function cachedChunkCount(): Promise<number | null> {
  const cached = await cacheGet<number>(CHUNK_COUNT_KEY);
  return typeof cached === "number" && cached > 0 ? cached : null;
}
