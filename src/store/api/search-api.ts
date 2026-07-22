import type { SearchResult } from "@/lib/anime/search";
import { baseApi } from "@/store/api/base-api";

/** Arguments for the client search query (SEARCH-01/04). */
export interface SearchArgs {
  /** Free-text title query. */
  q: string;
  /** Selected genre facets. */
  genres?: string[];
  /** 1-based page for load-more pagination. */
  page?: number;
}

/**
 * Builds `/anime/search?q=&genre=&genre=&page=` with repeated `genre` params so
 * it matches the route's `searchParams.getAll("genre")` — this avoids axios's
 * bracketed array serialization (`genre[]=`).
 */
function buildSearchUrl({ q, genres = [], page = 1 }: SearchArgs): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  for (const genre of genres) params.append("genre", genre);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/anime/search?${qs}` : "/anime/search";
}

/**
 * Client-side access to anime search (SEARCH-01/04). Extends the single
 * app-wide `baseApi` (never a new `createApi`) so caching and middleware stay
 * unified. Requests go to our `/api/anime/search` route handler, which consults
 * Redis and proxies Consumet — the browser never touches Consumet.
 */
export const searchApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    searchAnime: builder.query<SearchResult, SearchArgs>({
      query: (args) => ({ url: buildSearchUrl(args) }),
      providesTags: (_result, _error, args) => [
        {
          type: "Anime" as const,
          id: `search:${args.q}:${(args.genres ?? []).join(",")}:${args.page ?? 1}`,
        },
      ],
    }),
  }),
});

export const { useSearchAnimeQuery } = searchApi;
