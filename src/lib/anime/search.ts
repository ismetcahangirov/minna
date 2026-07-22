import "server-only";

import { CACHE_TTL, cacheGet, cacheKey, cacheSet } from "@/lib/cache";
import { consumetClient } from "@/lib/http/consumet";

import {
  type AnimeSummary,
  type ConsumetListResponse,
  toAnimeSummary,
} from "@/lib/anime/types";

/** How many results one search page requests from Consumet. */
export const SEARCH_PER_PAGE = 24;

/** Longest query we forward — guards the cache key and upstream call. */
const MAX_QUERY_LENGTH = 100;

export interface SearchParams {
  /** Free-text title query (SEARCH-01). Empty is allowed when `genres` is set. */
  query?: string;
  /** Genre facet filter (SEARCH-04), matched against {@link ANIME_GENRES}. */
  genres?: string[];
  /** 1-based page for "load more" pagination. */
  page?: number;
}

/** One page of normalized search results (SEARCH-02). */
export interface SearchResult {
  results: AnimeSummary[];
  page: number;
  hasNextPage: boolean;
}

const EMPTY: SearchResult = { results: [], page: 1, hasNextPage: false };

/** Trims, caps and lowercases a raw query so equal searches share a cache key. */
export function normalizeQuery(raw: string | undefined): string {
  return (raw ?? "").trim().slice(0, MAX_QUERY_LENGTH);
}

/** Keeps only non-empty genre strings, sorted for a stable cache key. */
function normalizeGenres(genres: string[] | undefined): string[] {
  if (!Array.isArray(genres)) return [];
  return [...new Set(genres.map((g) => g.trim()).filter(Boolean))].sort();
}

/**
 * Searches the Consumet AniList catalog (SEARCH-01/04).
 *
 * Uses the `advanced-search` endpoint so a free-text `query` and a `genres`
 * facet can be combined in one call; results are sorted by popularity for a
 * useful default ordering. A blank query with no genres short-circuits to an
 * empty page (the idle state renders no request).
 *
 * Short-TTL read-through Redis cache keyed by the normalized query, genres and
 * page — the search space is large and volatile, so results are only briefly
 * memoized and empty pages are never cached.
 *
 * Resilient by design: the public Consumet instance is deprecated, so callers
 * must configure a self-hosted `CONSUMET_API_URL`. When the origin is missing
 * or unreachable this resolves to an empty page rather than throwing, keeping
 * the search route online.
 */
export async function searchAnime({
  query,
  genres,
  page = 1,
}: SearchParams): Promise<SearchResult> {
  const q = normalizeQuery(query);
  const genreList = normalizeGenres(genres);
  const safePage = Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;

  // Nothing to search — idle state, no upstream call.
  if (!q && genreList.length === 0) return EMPTY;

  const key = cacheKey(
    "anime",
    "search",
    q || "*",
    genreList.join(",") || "-",
    safePage,
  );

  const cached = await cacheGet<SearchResult>(key);
  if (cached) return cached;

  try {
    const params: Record<string, string | number> = {
      page: safePage,
      perPage: SEARCH_PER_PAGE,
      sort: '["POPULARITY_DESC"]',
    };
    if (q) params.query = q;
    if (genreList.length > 0) params.genres = JSON.stringify(genreList);

    const { data } = await consumetClient.get<ConsumetListResponse>(
      "/meta/anilist/advanced-search",
      { params },
    );

    const results = (Array.isArray(data?.results) ? data.results : [])
      .map(toAnimeSummary)
      .filter((entry): entry is AnimeSummary => entry !== null);

    const result: SearchResult = {
      results,
      page: safePage,
      hasNextPage: data?.hasNextPage === true && results.length > 0,
    };

    // Never cache an empty page — a transient outage must not pin "no results".
    if (results.length > 0) await cacheSet(key, result, CACHE_TTL.short);
    return result;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : ((error as { message?: string })?.message ?? String(error));
    console.error(`[anime] search "${q}" unavailable:`, message);
    return { ...EMPTY, page: safePage };
  }
}
