import "server-only";

import { cache } from "react";

import { fetchAnimeInfo } from "@/lib/consumet/anilist";
import { CACHE_TTL, cacheGet, cacheKey, cacheSet } from "@/lib/cache";

import {
  type AnimeDetail,
  type AnimeEpisode,
  toAnimeDetail,
} from "@/lib/anime/types";

/**
 * Builds a playable episode list from AniList metadata when the streaming
 * sub-provider returned none — its scrapers are blocked from datacenter IPs
 * (see `@/lib/consumet/anilist`), so on Vercel the scraped list is always
 * empty. Episodes are numbered 1..N with the number as their id, which is
 * exactly how the embed player addresses them (`/watch/{animeId}/{number}` →
 * MegaPlay `ani/{animeId}/{number}`). The count prefers the aired-so-far figure
 * for currently-airing titles, otherwise the total; an unknown count (e.g. a
 * not-yet-aired title) is left empty so the UI shows its "no episodes" state.
 */
function ensureEpisodes(detail: AnimeDetail): AnimeDetail {
  if (detail.episodes.length > 0) return detail;

  const aired =
    typeof detail.currentEpisode === "number" && detail.currentEpisode > 0
      ? detail.currentEpisode
      : null;
  const total =
    typeof detail.totalEpisodes === "number" && detail.totalEpisodes > 0
      ? detail.totalEpisodes
      : null;
  const count = aired ?? total ?? 0;
  if (count <= 0) return detail;

  const episodes: AnimeEpisode[] = Array.from({ length: count }, (_, i) => ({
    id: String(i + 1),
    number: i + 1,
    title: null,
    description: null,
    airDate: null,
  }));
  return { ...detail, episodes };
}

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

      const parsed = toAnimeDetail(data);
      const detail = parsed ? ensureEpisodes(parsed) : null;
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
