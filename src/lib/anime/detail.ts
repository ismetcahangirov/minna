import "server-only";

import { cache } from "react";

import { fetchAnimeInfo } from "@/lib/consumet/anilist";
import { CACHE_TTL, cacheGet, cacheKey, cacheSet } from "@/lib/cache";

import { type AnimeDetail, toAnimeDetail } from "@/lib/anime/types";

/**
 * Returns the full detail record for one anime (DETAIL-01/02), or `null` when
 * it cannot be resolved.
 *
 * Long-TTL read-through Redis cache (anime metadata is near-static). Wrapped in
 * React `cache()` so the page component and `generateMetadata` (DETAIL-04)
 * share a single fetch per request.
 *
 * Resilient by design: anime data comes from the embedded AniList provider (see
 * `@/lib/consumet/anilist`), which maps AniList metadata onto the streaming
 * sub-provider's episode list. If it cannot be resolved this resolves to stale
 * cache (if any) or `null` — the detail route turns a `null` into a 404 rather
 * than crashing the render.
 */
export const getAnimeInfo = cache(
  async (id: string): Promise<AnimeDetail | null> => {
    const cleanId = id.trim();
    if (!cleanId) return null;

    const key = cacheKey("anime", "detail", cleanId);

    const cached = await cacheGet<AnimeDetail>(key);
    if (cached) return cached;

    try {
      const data = await fetchAnimeInfo(cleanId);

      const detail = toAnimeDetail(data);
      if (detail) await cacheSet(key, detail, CACHE_TTL.long);
      return detail;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : ((error as { message?: string })?.message ?? String(error));
      console.error(`[anime] detail "${cleanId}" unavailable:`, message);
      return null;
    }
  },
);
