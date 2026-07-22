import "server-only";

import { cache } from "react";

import { CACHE_TTL, cacheGet, cacheKey, cacheSet } from "@/lib/cache";
import { consumetClient } from "@/lib/http/consumet";

import {
  type AnimeSection,
  type AnimeSummary,
  type ConsumetListResponse,
  toAnimeSummary,
} from "@/lib/anime/types";

/** How many cards each home row requests from Consumet. */
export const SECTION_LIMIT = 14;

interface SectionSource {
  /** Consumet AniList meta endpoint. */
  path: string;
  /** Extra query params beyond `page`/`perPage`. */
  params: Record<string, string | number>;
  /** Redis TTL — recent episodes churn fast, the rest are near-static. */
  ttl: number;
}

const SECTION_SOURCES: Record<AnimeSection, SectionSource> = {
  trending: {
    path: "/meta/anilist/trending",
    params: {},
    ttl: CACHE_TTL.medium,
  },
  popular: { path: "/meta/anilist/popular", params: {}, ttl: CACHE_TTL.medium },
  "top-rated": {
    // AniList sorts by descending average score for the "top rated" listing.
    path: "/meta/anilist/advanced-search",
    params: { sort: '["SCORE_DESC"]' },
    ttl: CACHE_TTL.medium,
  },
  recent: {
    path: "/meta/anilist/recent-episodes",
    params: {},
    ttl: CACHE_TTL.short,
  },
};

async function fetchSectionFromConsumet(
  source: SectionSource,
  limit: number,
): Promise<AnimeSummary[]> {
  const { data } = await consumetClient.get<ConsumetListResponse>(source.path, {
    params: { page: 1, perPage: limit, ...source.params },
  });

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
 * Resilient by design: the public Consumet instance is deprecated, so callers
 * must configure a self-hosted `CONSUMET_API_URL`. When the origin is missing
 * or unreachable this resolves to stale cache (if any) or an empty list rather
 * than throwing, keeping the server-rendered home page online. Empty results
 * are never cached, so a transient outage does not pin an empty section.
 */
export const getAnimeSection = cache(
  async (
    section: AnimeSection,
    limit: number = SECTION_LIMIT,
  ): Promise<AnimeSummary[]> => {
    const source = SECTION_SOURCES[section];
    const key = cacheKey("anime", "section", section, limit);

    const cached = await cacheGet<AnimeSummary[]>(key);
    if (cached && cached.length > 0) return cached;

    try {
      const fresh = await fetchSectionFromConsumet(source, limit);
      if (fresh.length > 0) await cacheSet(key, fresh, source.ttl);
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
