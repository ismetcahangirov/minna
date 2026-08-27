import "server-only";

import { canonicalSlugs } from "@/lib/anime/canonical-slug";
import {
  animeEpisodesPageHref,
  animeHref,
  animeSlug,
  episodesPageCount,
  watchHref,
} from "@/lib/anime/href";
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
  /** Episode count, or null when unknown — decides the `?page=` span. */
  episodes?: number | null;
  /** Present on a watch entry instead of {@link episodes}. */
  episodeNumber?: number;
}

/** Cache key for one stored chunk of catalog entries. */
function chunkKey(index: number): string {
  return cacheKey("sitemap", "anime", "chunk", index, "v2");
}

/**
 * Walks the catalog and stores it as chunks, returning how many there are.
 *
 * Chunking happens here, at write time, rather than when a request slices a
 * shared list. That is the whole point: a chunk request reads one chunk's
 * entries, not the entire catalog's, so its Redis payload is a fraction of the
 * whole and it builds only the URLs it is going to emit.
 *
 * Boundaries are drawn by URL budget rather than by row count, because one row
 * is worth anywhere from three URLs to several dozen — a long series spans many
 * `?page=` URLs — so cutting every N rows would produce wildly uneven files.
 */
async function buildCatalogChunks(): Promise<number> {
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
      episodes: entry.episodes,
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
    budget += urlsPerRow(row);
    current.push(row);
    if (budget >= ANIME_CHUNK_SIZE) {
      chunks.push(current);
      current = [];
      budget = 0;
    }
  }
  if (current.length > 0) chunks.push(current);
  if (chunks.length === 0) chunks.push([]);

  await Promise.all([
    ...chunks.map((entries, index) =>
      cacheSet(chunkKey(index), entries, SECTION_TTL),
    ),
    cacheSet(CHUNK_COUNT_KEY, chunks.length, SECTION_TTL),
  ]);

  return chunks.length;
}

/** How many URLs one row expands into, across all three locales. */
function urlsPerRow(row: CatalogEntry): number {
  if (row.episodeNumber !== undefined) return locales.length;
  const pages = row.episodes ? episodesPageCount(row.episodes) : 1;
  // The detail page plus one URL per episodes-list page.
  return locales.length * (1 + pages);
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
    urls.push(
      ...perLocale(animeHref(entry.slug), {
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.8,
      }),
    );

    // The episodes list of a long series spans several `?page=` URLs — each is
    // a distinct set of episodes, so each is listed. Titles whose episode count
    // is unknown contribute their first page only.
    const pages = entry.episodes ? episodesPageCount(entry.episodes) : 1;
    for (let page = 1; page <= pages; page++) {
      urls.push(
        ...perLocale(animeEpisodesPageHref(entry.slug, null, { page }), {
          lastModified: now,
          changeFrequency: "weekly",
          priority: page === 1 ? 0.7 : 0.5,
        }),
      );
    }
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

  // Range is checked against the known count first, so an out-of-range request
  // is refused for the price of one small read. Without this, a crawler holding
  // a stale index — or anything probing `anime-99.xml` — would trigger a full
  // catalog walk just to be told the chunk does not exist.
  const known = await cachedChunkCount();
  if (known !== null && index >= known) return null;

  const cached = await cacheGet<CatalogEntry[]>(chunkKey(index));
  if (cached) return { urls: catalogUrls(cached), chunkCount: known ?? 1 };

  // Either nothing is cached yet or this chunk expired out from under a set
  // that is still partly warm. Rebuilding is the only way to know the count.
  const chunkCount = await buildCatalogChunks();
  if (index >= chunkCount) return null;

  const rebuilt = await cacheGet<CatalogEntry[]>(chunkKey(index));
  return rebuilt ? { urls: catalogUrls(rebuilt), chunkCount } : null;
}

/**
 * How many catalog chunks the index should list.
 *
 * Reads the count a previous chunk build left behind — one small Redis GET,
 * which is what keeps the index instant. Falls back to a single chunk when the
 * key is cold: the crawler fetches `anime-0`, that fetch writes the real count,
 * and the next index read lists the rest. One crawl cycle behind at worst, and
 * only on a cold cache.
 */
export async function animeChunkCount(): Promise<number> {
  return (await cachedChunkCount()) ?? 1;
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
