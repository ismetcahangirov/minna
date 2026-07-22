import "server-only";

import { CACHE_TTL, cacheGet, cacheKey, cacheSet } from "@/lib/cache";
import { consumetClient } from "@/lib/http/consumet";
import { BROWSE_PAGE_SIZE, type PagedResult } from "@/lib/browse/types";

import {
  type AnimeSummary,
  type ConsumetListResponse,
  toAnimeSummary,
} from "@/lib/anime/types";

/** Guards the cache key and upstream call against absurd deep-link pages. */
const MAX_PAGE = 500;

function safePage(page: number | undefined): number {
  if (!Number.isFinite(page) || (page as number) < 1) return 1;
  return Math.min(Math.floor(page as number), MAX_PAGE);
}

/**
 * One page of the Popular listing (LIST-02) for the infinite-scroll page.
 *
 * Uses the AniList `advanced-search` endpoint sorted by `POPULARITY_DESC` so the
 * listing paginates cleanly (the `/meta/anilist/popular` endpoint is used for
 * the fixed-size home row; this needs an arbitrary `page`). Read-through Redis
 * cache with a medium TTL — the popular ranking is near-static.
 *
 * Resilient by design: the public Consumet instance is deprecated, so callers
 * must configure a self-hosted `CONSUMET_API_URL`. When the origin is missing or
 * unreachable this resolves to stale cache (if any) or an empty page rather than
 * throwing, keeping the page online. Empty pages are never cached.
 */
export async function listPopularAnime(
  page: number = 1,
): Promise<PagedResult<AnimeSummary>> {
  const current = safePage(page);
  const key = cacheKey("anime", "popular-page", current, BROWSE_PAGE_SIZE);

  const cached = await cacheGet<PagedResult<AnimeSummary>>(key);
  if (cached) return cached;

  try {
    const { data } = await consumetClient.get<ConsumetListResponse>(
      "/meta/anilist/advanced-search",
      {
        params: {
          page: current,
          perPage: BROWSE_PAGE_SIZE,
          sort: '["POPULARITY_DESC"]',
        },
      },
    );

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
