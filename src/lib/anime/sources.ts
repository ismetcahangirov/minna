import "server-only";

import { cache } from "react";

import { fetchEpisodeSources } from "@/lib/consumet/anilist";
import { CACHE_TTL, cacheGet, cacheKey, cacheSet } from "@/lib/cache";

import { type EpisodeStream, toEpisodeStream } from "@/lib/anime/types";

/**
 * Resolves the playable streams for one episode (PLAYER-01), or an empty stream
 * when none are available. Episode ids are provider-scoped, produced by the same
 * embedded AniList sub-provider that built the episode list in `detail.ts`.
 *
 * Short-TTL Redis cache: stream urls are signed/rotated by the CDN, so they go
 * stale far sooner than anime metadata. Wrapped in React `cache()` so the page
 * component and `generateMetadata` share a single fetch per request.
 *
 * Resilient by design: streams come from the embedded AniList provider (see
 * `@/lib/consumet/anilist`). When none can be resolved this returns an empty
 * {@link EpisodeStream} — the watch page renders an "unavailable" state instead
 * of crashing.
 */
export const getEpisodeSources = cache(
  async (episodeId: string): Promise<EpisodeStream> => {
    const cleanId = episodeId.trim();
    if (!cleanId) return { sources: [], subtitles: [], headers: {} };

    const key = cacheKey("anime", "watch", cleanId);

    const cached = await cacheGet<EpisodeStream>(key);
    if (cached) return cached;

    try {
      const data = await fetchEpisodeSources(cleanId);

      const stream = toEpisodeStream(data);
      // Only cache a real hit — never memoize an empty (origin-down) result.
      if (stream.sources.length > 0) {
        await cacheSet(key, stream, CACHE_TTL.short);
      }
      return stream;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : ((error as { message?: string })?.message ?? String(error));
      console.error(`[anime] sources "${cleanId}" unavailable:`, message);
      return { sources: [], subtitles: [], headers: {} };
    }
  },
);
