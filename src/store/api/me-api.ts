import type { AnimeUserState } from "@/lib/anime/user-state";
import type { WatchProgressState } from "@/lib/watch/types";
import { baseApi } from "@/store/api/base-api";

interface WatchProgressArg {
  animeId: string;
  episodeId: string;
}

/**
 * What the signed-in viewer has done with the anime on screen, read in the
 * browser (PERF-05).
 *
 * These used to be server-rendered into the anime, episodes and watch routes,
 * which made every one of them personalised and therefore uncacheable — the
 * same problem the header had in #226, and the reason the account ran through
 * its Fluid Active CPU allowance. Reading them here keeps the surrounding HTML
 * identical for every visitor, so the CDN can serve it, and only clients that
 * run JavaScript *and* are signed in ever ask.
 *
 * Extends the single app-wide `baseApi` (never a new `createApi`), so the four
 * islands that need the anime state on the detail page — favorite button,
 * library menu, progress bar and the episode ticks — share one in-flight
 * request. Tagged so the existing `Favorites` and `WatchProgress` invalidations
 * reach them.
 */
export const meApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAnimeUserState: builder.query<AnimeUserState, string>({
      query: (animeId) => ({ url: `/me/anime/${encodeURIComponent(animeId)}` }),
      providesTags: (_result, _error, animeId) => [
        { type: "Favorites" as const, id: `anime:${animeId}` },
        { type: "WatchProgress" as const, id: `anime:${animeId}` },
      ],
    }),
    getWatchProgress: builder.query<
      WatchProgressState | null,
      WatchProgressArg
    >({
      query: ({ animeId, episodeId }) => ({
        url: `/me/watch/${encodeURIComponent(animeId)}/${encodeURIComponent(episodeId)}`,
      }),
      providesTags: (_result, _error, { animeId, episodeId }) => [
        { type: "WatchProgress" as const, id: `${animeId}:${episodeId}` },
      ],
    }),
  }),
});

export const { useGetAnimeUserStateQuery, useGetWatchProgressQuery } = meApi;
