import "server-only";

import { and, eq } from "drizzle-orm";

import { favorites } from "@/db/schema";

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
