import "server-only";

import { CACHE_TTL, cacheKey, getOrSet } from "@/lib/cache";

import { ANIME_GENRES, toCategories, type Category } from "@/lib/anime/genres";

const CATEGORIES_CACHE_KEY = cacheKey("anime", "categories");

/**
 * Returns the anime categories shown in the header dropdown (HEADER-02).
 *
 * Read-through Redis cache with a long TTL: categories change rarely, so this
 * follows the consumet-data-fetching skill's long-TTL rule. The producer is a
 * single seam — when a live Consumet genre source becomes available it can
 * replace the static taxonomy here without touching any consumer.
 */
export async function getCategories(): Promise<Category[]> {
  return getOrSet(CATEGORIES_CACHE_KEY, CACHE_TTL.long, async () =>
    toCategories([...ANIME_GENRES]),
  );
}
