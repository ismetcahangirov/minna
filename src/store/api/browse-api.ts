import type { AnimeSummary } from "@/lib/anime/types";
import type { BlogSummary } from "@/lib/blog/types";
import type { FavoriteItem } from "@/lib/favorites/types";
import type { PagedResult } from "@/lib/browse/types";
import { baseApi } from "@/store/api/base-api";

/**
 * Client-side pagination endpoints for the infinite-scroll pages (EPIC-08):
 * Popular, Blogs and Favorites. All extend the single app-wide `baseApi` (never
 * a new `createApi`) so caching, tags and middleware stay unified, and all hit
 * our own Next.js route handlers, which own the Redis/Consumet/DB work.
 *
 * Each page is cached under its own tag id so a "load more" fetch is memoized
 * and re-visiting the page is instant. Favorites is additionally invalidated by
 * the toggle-favorite mutation via the shared `Favorites` tag.
 */
export const browseApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPopularPage: builder.query<PagedResult<AnimeSummary>, number>({
      query: (page) => ({ url: `/anime/popular`, params: { page } }),
      providesTags: (_result, _error, page) => [
        { type: "Anime" as const, id: `popular:${page}` },
      ],
    }),
    getBlogPage: builder.query<PagedResult<BlogSummary>, number>({
      query: (page) => ({ url: `/blog`, params: { page } }),
      providesTags: (_result, _error, page) => [
        { type: "Blogs" as const, id: `list:${page}` },
      ],
    }),
    getFavoritesPage: builder.query<PagedResult<FavoriteItem>, number>({
      query: (page) => ({ url: `/favorites`, params: { page } }),
      providesTags: (_result, _error, page) => [
        { type: "Favorites" as const, id: `list:${page}` },
      ],
    }),
  }),
});

export const {
  useGetPopularPageQuery,
  useGetBlogPageQuery,
  useGetFavoritesPageQuery,
} = browseApi;
