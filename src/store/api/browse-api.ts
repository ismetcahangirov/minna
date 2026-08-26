import type { AnimeSummary } from "@/lib/anime/types";
import type { BlogSummary } from "@/lib/blog/types";
import type { FavoriteItem } from "@/lib/favorites/types";
import type { PagedResult } from "@/lib/browse/types";
import { baseApi } from "@/store/api/base-api";

interface GenrePageArg {
  slug: string;
  page: number;
}

/**
 * The blog listing collapses each translation group to one card per reader
 * locale, so a page of it only means something alongside the locale it was
 * selected for. `/api/blog` sits outside the `[locale]` segment — a fetch from
 * `/tr/blogs` is still a request to `/api/blog` — so the locale travels as a
 * parameter rather than being inferred from a path that does not carry it.
 */
interface BlogPageArg {
  page: number;
  locale: string;
}

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
    getNewPage: builder.query<PagedResult<AnimeSummary>, number>({
      query: (page) => ({ url: `/anime/new`, params: { page } }),
      providesTags: (_result, _error, page) => [
        { type: "Anime" as const, id: `new:${page}` },
      ],
    }),
    getGenrePage: builder.query<PagedResult<AnimeSummary>, GenrePageArg>({
      query: ({ slug, page }) => ({
        url: `/anime/genre/${encodeURIComponent(slug)}`,
        params: { page },
      }),
      providesTags: (_result, _error, { slug, page }) => [
        { type: "Anime" as const, id: `genre:${slug}:${page}` },
      ],
    }),
    getBlogPage: builder.query<PagedResult<BlogSummary>, BlogPageArg>({
      query: ({ page, locale }) => ({ url: `/blog`, params: { page, locale } }),
      providesTags: (_result, _error, { page, locale }) => [
        { type: "Blogs" as const, id: `list:${locale}:${page}` },
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
  useGetNewPageQuery,
  useGetGenrePageQuery,
  useGetBlogPageQuery,
  useGetFavoritesPageQuery,
} = browseApi;
