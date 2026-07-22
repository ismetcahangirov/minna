"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { favorites } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";

export interface ToggleFavoriteInput {
  animeId: string;
  title: string;
  image?: string | null;
}

export interface FavoriteResult {
  ok: boolean;
  isFavorite: boolean;
  /** True when the action failed because the user is not signed in. */
  unauthorized?: boolean;
}

/**
 * Adds or removes the anime from the current user's favorites (DETAIL-03).
 *
 * Auth-guarded server action: returns `unauthorized` when signed out so the
 * client can send the user to the login flow. Toggling is derived from the
 * current row state (unique on user+anime), and the favorites listing is
 * revalidated. `@/db` is imported dynamically so `DATABASE_URL` stays out of
 * the build-time module graph.
 */
export async function toggleFavorite(
  input: ToggleFavoriteInput,
): Promise<FavoriteResult> {
  const user = await getCurrentUser();
  if (!user?.id) return { ok: false, isFavorite: false, unauthorized: true };

  const animeId = input.animeId?.trim();
  if (!animeId) return { ok: false, isFavorite: false };

  try {
    const { db } = await import("@/db");

    const existing = await db
      .select({ id: favorites.id })
      .from(favorites)
      .where(and(eq(favorites.userId, user.id), eq(favorites.animeId, animeId)))
      .limit(1);

    if (existing.length > 0) {
      await db.delete(favorites).where(eq(favorites.id, existing[0].id));
      revalidatePath("/favorites");
      return { ok: true, isFavorite: false };
    }

    await db.insert(favorites).values({
      userId: user.id,
      animeId,
      title: input.title?.trim() || "Untitled",
      image: input.image?.trim() || null,
    });
    revalidatePath("/favorites");
    return { ok: true, isFavorite: true };
  } catch (error) {
    console.error("[favorites] toggle failed:", (error as Error).message);
    return { ok: false, isFavorite: false };
  }
}
