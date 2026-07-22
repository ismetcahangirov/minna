import "server-only";

import { cache } from "react";

import {
  advancedSearchAnime,
  fetchPopular,
  fetchRecent,
  fetchTrending,
} from "@/lib/consumet/anilist";
import { CACHE_TTL, cacheGet, cacheKey, cacheSet } from "@/lib/cache";

import {
  type AnimeSection,
  type AnimeSummary,
  type ConsumetListResponse,
  toAnimeSummary,
} from "@/lib/anime/types";

/** How many cards each home row requests from the AniList provider. */
export const SECTION_LIMIT = 14;

/** Redis TTL per section — recent episodes churn fast, the rest are near-static. */
const SECTION_TTL: Record<AnimeSection, number> = {
  trending: CACHE_TTL.medium,
  popular: CACHE_TTL.medium,
  "top-rated": CACHE_TTL.medium,
  recent: CACHE_TTL.short,
};

async function fetchSection(
  section: AnimeSection,
  limit: number,
): Promise<AnimeSummary[]> {
  let data: ConsumetListResponse;
  switch (section) {
    case "trending":
      data = await fetchTrending(1, limit);
      break;
    case "popular":
      data = await fetchPopular(1, limit);
      break;
    case "top-rated":
      // AniList sorts by descending average score for the "top rated" listing.
      data = await advancedSearchAnime({
        sort: ["SCORE_DESC"],
        page: 1,
        perPage: limit,
      });
      break;
    case "recent":
      data = await fetchRecent(1, limit);
      break;
  }

  const results = Array.isArray(data?.results) ? data.results : [];
  return results
    .map(toAnimeSummary)
    .filter((entry): entry is AnimeSummary => entry !== null)
    .slice(0, limit);
}

/**
 * Returns one home section's anime list.
 *
 * Read-through Redis cache (short TTL for recent episodes, medium for the
 * rest — see the consumet-data-fetching skill). Wrapped in React `cache()` so
 * repeated calls within a single request (e.g. the hero and the trending row
 * both needing "trending") share one result and one cache round-trip.
 *
 * Resilient by design: anime data comes from the embedded AniList provider
 * (see `@/lib/consumet/anilist`). If a listing cannot be resolved this resolves
 * to stale cache (if any) or an empty list rather than throwing, keeping the
 * server-rendered home page online. Empty results are never cached, so a
 * transient outage does not pin an empty section.
 */
export const getAnimeSection = cache(
  async (
    section: AnimeSection,
    limit: number = SECTION_LIMIT,
  ): Promise<AnimeSummary[]> => {
    const key = cacheKey("anime", "section", section, limit);

    const cached = await cacheGet<AnimeSummary[]>(key);
    if (cached && cached.length > 0) return cached;

    try {
      const fresh = await fetchSection(section, limit);
      if (fresh.length > 0) await cacheSet(key, fresh, SECTION_TTL[section]);
      return fresh;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : ((error as { message?: string })?.message ?? String(error));
      console.error(`[anime] section "${section}" unavailable:`, message);
      return cached ?? [];
    }
  },
);

/**
 * The single featured title for the hero banner (HOME-01) — the top trending
 * anime. Shares the cached "trending" fetch above.
 */
export const getFeaturedAnime = cache(
  async (): Promise<AnimeSummary | null> => {
    const trending = await getAnimeSection("trending");
    return trending[0] ?? null;
  },
);
