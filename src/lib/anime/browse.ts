import "server-only";

import { advancedSearchAnime } from "@/lib/consumet/anilist";
import { CACHE_TTL, cacheGet, cacheKey, cacheSet } from "@/lib/cache";
import { BROWSE_PAGE_SIZE, type PagedResult } from "@/lib/browse/types";

import { type AnimeSummary, toAnimeSummary } from "@/lib/anime/types";

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
 * Resilient by design: anime data comes from the embedded AniList provider
 * (see `@/lib/consumet/anilist`). If a page cannot be resolved this resolves to
 * stale cache (if any) or an empty page rather than throwing, keeping the page
 * online. Empty pages are never cached.
 */
export async function listPopularAnime(
  page: number = 1,
): Promise<PagedResult<AnimeSummary>> {
  const current = safePage(page);
  const key = cacheKey("anime", "popular-page", current, BROWSE_PAGE_SIZE);

  const cached = await cacheGet<PagedResult<AnimeSummary>>(key);
  if (cached) return cached;

  try {
    const data = await advancedSearchAnime({
      sort: ["POPULARITY_DESC"],
      page: current,
      perPage: BROWSE_PAGE_SIZE,
    });

    const items = (Array.isArray(data?.results) ? data.results : [])
      .map(toAnimeSummary)
      .filter((entry): entry is AnimeSummary => entry !== null);

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
