import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { favorites } from "@/db/schema";
import { BROWSE_PAGE_SIZE, type PagedResult } from "@/lib/browse/types";
import type { FavoriteItem } from "@/lib/favorites/types";

/**
 * Whether the given user has bookmarked `animeId` (DETAIL-03) — used to seed
 * the detail page's favorite button initial state.
 *
 * `@/db` is imported dynamically so its `DATABASE_URL` requirement stays out of
 * the build-time module graph (matching the auth layer). Any failure degrades
 * to `false` rather than breaking the render.
 */
export async function isFavorite(
  userId: string,
  animeId: string,
): Promise<boolean> {
  try {
    const { db } = await import("@/db");
    const rows = await db
      .select({ id: favorites.id })
      .from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.animeId, animeId)))
      .limit(1);
    return rows.length > 0;
  } catch (error) {
    console.error("[favorites] isFavorite failed:", (error as Error).message);
    return false;
  }
}

/** Guards the query against absurd deep-link pages. */
const MAX_PAGE = 500;

function safePage(page: number | undefined): number {
  if (!Number.isFinite(page) || (page as number) < 1) return 1;
  return Math.min(Math.floor(page as number), MAX_PAGE);
}

/**
 * One page of a user's favorited anime, newest first (LIST-04).
 *
 * Fetches `BROWSE_PAGE_SIZE + 1` rows so `hasNextPage` is known without a second
 * count query. `@/db` is imported dynamically so its `DATABASE_URL` requirement
 * stays out of the build-time module graph. Any failure degrades to an empty
 * page rather than breaking the render.
 */
export async function listFavorites(
  userId: string,
  page: number = 1,
): Promise<PagedResult<FavoriteItem>> {
  const current = safePage(page);

  if (!userId) return { items: [], page: current, hasNextPage: false };

  try {
    const { db } = await import("@/db");
    const rows = await db
      .select({
        animeId: favorites.animeId,
        title: favorites.title,
        image: favorites.image,
        createdAt: favorites.createdAt,
      })
      .from(favorites)
      .where(eq(favorites.userId, userId))
      .orderBy(desc(favorites.createdAt))
      .limit(BROWSE_PAGE_SIZE + 1)
      .offset((current - 1) * BROWSE_PAGE_SIZE);

    const hasNextPage = rows.length > BROWSE_PAGE_SIZE;
    const items: FavoriteItem[] = rows
      .slice(0, BROWSE_PAGE_SIZE)
      .map((row) => ({
        animeId: row.animeId,
        title: row.title,
        image: row.image,
        createdAt: row.createdAt.toISOString(),
      }));

    return { items, page: current, hasNextPage };
  } catch (error) {
    console.error(
      "[favorites] listFavorites failed:",
      (error as Error).message,
    );
    return { items: [], page: current, hasNextPage: false };
  }
}
