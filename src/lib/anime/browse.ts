import "server-only";

import { advancedSearchAnime } from "@/lib/anime/provider";
import { attachCanonicalSlugs } from "@/lib/anime/canonical-slug";
import { CACHE_TTL, cacheGet, cacheKey, cacheSet } from "@/lib/cache";
import { BROWSE_PAGE_SIZE, type PagedResult } from "@/lib/browse/types";

import { hasPlayableEpisodes } from "@/lib/anime/episodes";
import { findCategoryBySlug } from "@/lib/anime/genres";
import { type AnimeSummary, toAnimeSummary } from "@/lib/anime/types";

/**
 * Bumped when the cached listing shape changes, so an entry written before it
 * is ignored rather than read back short a field — v2 carries the canonical
 * URL segment resolved for each summary.
 */
const LISTING_CACHE_VERSION = "v2";
/** Guards the cache key and upstream call against absurd deep-link pages. */
const MAX_PAGE = 500;

function safePage(page: number | undefined): number {
  if (!Number.isFinite(page) || (page as number) < 1) return 1;
  return Math.min(Math.floor(page as number), MAX_PAGE);
}

/**
 * One page of the Popular listing (LIST-02) for the infinite-scroll page.
 *
 * Uses the AniList `advancedSearch` provider sorted by `POPULARITY_DESC` so the
 * listing paginates cleanly with an arbitrary `page`. Read-through Redis cache
 * with a medium TTL — the popular ranking is near-static.
 *
 * Resilient by design: anime data comes from `@/lib/anime/provider`, which tries
 * AniList and falls back to Kitsu. If neither can resolve a page this resolves
 * to stale cache (if any) or an empty page rather than throwing, keeping the
 * page online. Empty pages are never cached.
 */
export async function listPopularAnime(
  page: number = 1,
): Promise<PagedResult<AnimeSummary>> {
  const current = safePage(page);
  const key = cacheKey(
    "anime",
    "popular-page",
    LISTING_CACHE_VERSION,
    current,
    BROWSE_PAGE_SIZE,
  );

  const cached = await cacheGet<PagedResult<AnimeSummary>>(key);
  if (cached) return cached;

  try {
    const data = await advancedSearchAnime({
      sort: ["POPULARITY_DESC"],
      page: current,
      perPage: BROWSE_PAGE_SIZE,
    });

    const items = await attachCanonicalSlugs(
      (Array.isArray(data?.results) ? data.results : [])
        .map(toAnimeSummary)
        .filter((entry): entry is AnimeSummary => entry !== null)
        // Drop titles with no playable episodes — their detail page would be
        // empty.
        .filter(hasPlayableEpisodes),
    );

    const result: PagedResult<AnimeSummary> = {
      items,
      page: current,
      hasNextPage: data?.hasNextPage === true && items.length > 0,
    };

    if (items.length > 0) await cacheSet(key, result, CACHE_TTL.medium);
    return result;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : ((error as { message?: string })?.message ?? String(error));
    console.error(`[anime] popular page ${current} unavailable:`, message);
    return cached ?? { items: [], page: current, hasNextPage: false };
  }
}

/**
 * One page of the New/Recent listing for the infinite-scroll /new page.
 *
 * Uses the AniList `advancedSearch` provider with `START_DATE_DESC` and
 * `RELEASING` status so only currently-airing titles appear, newest first.
 * Read-through Redis cache with a short TTL — new episodes change frequently.
 */
export async function listRecentAnime(
  page: number = 1,
): Promise<PagedResult<AnimeSummary>> {
  const current = safePage(page);
  const key = cacheKey(
    "anime",
    "recent-page",
    LISTING_CACHE_VERSION,
    current,
    BROWSE_PAGE_SIZE,
  );

  const cached = await cacheGet<PagedResult<AnimeSummary>>(key);
  if (cached) return cached;

  try {
    const data = await advancedSearchAnime({
      sort: ["START_DATE_DESC"],
      page: current,
      perPage: BROWSE_PAGE_SIZE,
    });

    const items = await attachCanonicalSlugs(
      (Array.isArray(data?.results) ? data.results : [])
        .map(toAnimeSummary)
        .filter((entry): entry is AnimeSummary => entry !== null)
        .filter(hasPlayableEpisodes),
    );

    const result: PagedResult<AnimeSummary> = {
      items,
      page: current,
      hasNextPage: data?.hasNextPage === true && items.length > 0,
    };

    if (items.length > 0) await cacheSet(key, result, CACHE_TTL.short);
    return result;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : ((error as { message?: string })?.message ?? String(error));
    console.error(`[anime] new/recent page ${current} unavailable:`, message);
    return cached ?? { items: [], page: current, hasNextPage: false };
  }
}

/**
 * One genre-filtered listing page for /genre/[slug]. The category slug is
 * resolved to AniList's canonical genre name before calling advancedSearch.
 */
export async function listGenreAnime(
  genreSlug: string,
  page: number = 1,
): Promise<PagedResult<AnimeSummary> | null> {
  const category = findCategoryBySlug(genreSlug);
  if (!category) return null;

  const current = safePage(page);
  const key = cacheKey(
    "anime",
    "genre-page",
    LISTING_CACHE_VERSION,
    category.slug,
    current,
    BROWSE_PAGE_SIZE,
  );

  const cached = await cacheGet<PagedResult<AnimeSummary>>(key);
  if (cached) return cached;

  try {
    const data = await advancedSearchAnime({
      genres: [category.name],
      sort: ["POPULARITY_DESC"],
      page: current,
      perPage: BROWSE_PAGE_SIZE,
    });

    const items = await attachCanonicalSlugs(
      (Array.isArray(data?.results) ? data.results : [])
        .map(toAnimeSummary)
        .filter((entry): entry is AnimeSummary => entry !== null)
        .filter(hasPlayableEpisodes),
    );

    const result: PagedResult<AnimeSummary> = {
      items,
      page: current,
      hasNextPage: data?.hasNextPage === true && items.length > 0,
    };

    if (items.length > 0) await cacheSet(key, result, CACHE_TTL.medium);
    return result;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : ((error as { message?: string })?.message ?? String(error));
    console.error(
      "[anime] genre " + category.slug + " page " + current + " unavailable:",
      message,
    );
    return cached ?? { items: [], page: current, hasNextPage: false };
  }
}
