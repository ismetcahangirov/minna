import type { AnimeSection, AnimeSummary } from "@/lib/anime/types";
import { baseApi } from "@/store/api/base-api";

interface AnimeSectionResponse {
  results: AnimeSummary[];
}

/**
 * Client-side access to the home anime sections (HOME-07). Extends the single
 * app-wide `baseApi` (never a new `createApi`) so caching, tags and middleware
 * stay unified. Requests go to our `/api/anime/[section]` route handler, which
 * consults Redis and proxies Consumet — the browser never touches Consumet.
 *
 * Server components fetch the same sections directly via `getAnimeSection`
 * (SSR); this slice powers interactive client islands such as the hero
 * carousel and refetch-on-focus.
 */
export const animeApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAnimeSection: builder.query<AnimeSummary[], AnimeSection>({
      query: (section) => ({ url: `/anime/${section}` }),
      transformResponse: (response: AnimeSectionResponse) => response.results,
      providesTags: (_result, _error, section) => [
        { type: "Anime" as const, id: section },
      ],
    }),
  }),
});

export const { useGetAnimeSectionQuery } = animeApi;
