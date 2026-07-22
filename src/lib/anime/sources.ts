import "server-only";

import { cache } from "react";

import { CACHE_TTL, cacheGet, cacheKey, cacheSet } from "@/lib/cache";
import { consumetClient } from "@/lib/http/consumet";

import {
  type ConsumetWatchResponse,
  type EpisodeStream,
  toEpisodeStream,
} from "@/lib/anime/types";

/**
 * Must match the provider used to resolve the episode list in `detail.ts`;
 * episode ids are provider-scoped, so the watch endpoint has to be queried with
 * the same sub-provider that produced them.
 */
const EPISODE_PROVIDER = "gogoanime";

/**
 * Resolves the playable streams for one episode (PLAYER-01), or an empty stream
 * when none are available.
 *
 * Short-TTL Redis cache: stream urls are signed/rotated by the CDN, so they go
 * stale far sooner than anime metadata. Wrapped in React `cache()` so the page
 * component and `generateMetadata` share a single fetch per request.
 *
 * Resilient by design: the public Consumet instance is deprecated (self-host
 * `CONSUMET_API_URL`). When the origin is missing or unreachable this resolves
 * to an empty {@link EpisodeStream} — the watch page renders an "unavailable"
 * state instead of crashing.
 */
export const getEpisodeSources = cache(
  async (episodeId: string): Promise<EpisodeStream> => {
    const cleanId = episodeId.trim();
    if (!cleanId) return { sources: [], subtitles: [], headers: {} };

    const key = cacheKey("anime", "watch", cleanId);

    const cached = await cacheGet<EpisodeStream>(key);
    if (cached) return cached;

    try {
      const { data } = await consumetClient.get<ConsumetWatchResponse>(
        `/meta/anilist/watch/${encodeURIComponent(cleanId)}`,
        { params: { provider: EPISODE_PROVIDER } },
      );

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
