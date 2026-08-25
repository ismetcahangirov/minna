"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { userLibrary } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { isLibraryStatus, type LibraryStatus } from "@/lib/library/types";

export interface SetLibraryStatusInput {
  animeId: string;
  status: LibraryStatus;
  /** Denormalized onto the row when the entry is created from the anime page. */
  title?: string | null;
  image?: string | null;
  totalEpisodes?: number | null;
}

export interface LibraryActionResult {
  ok: boolean;
  /** The shelf the anime now sits on, or null once it is removed. */
  status?: LibraryStatus | null;
  /** True when the action failed because the member is not signed in. */
  unauthorized?: boolean;
}

/**
 * Files an anime on a shelf the member picked themselves (LIB-05).
 *
 * Sets `status_locked`, which permanently opts the entry out of the automatic
 * watching/completed derivation: once a member says a series is finished — or
 * dropped, or on hold — watching another episode must not quietly reclassify
 * it. Marking an entry `completed` by hand also fills the watched counter to
 * the series length, so the progress bar matches the claim.
 *
 * Creates the entry when the anime is not on any shelf yet, so a member can add
 * something they plan to watch without opening the player first.
 */
export async function setLibraryStatus(
  input: SetLibraryStatusInput,
): Promise<LibraryActionResult> {
  const user = await getCurrentUser();
  if (!user?.id) return { ok: false, unauthorized: true };

  const animeId = input.animeId?.trim();
  if (!animeId || !isLibraryStatus(input.status)) return { ok: false };

  const status = input.status;
  const title = input.title?.trim() || "Untitled";
  const image = input.image?.trim() || null;
  const total =
    typeof input.totalEpisodes === "number" && input.totalEpisodes > 0
      ? Math.floor(input.totalEpisodes)
      : null;
  // Claiming a series is finished fills the bar; the count is capped by the
  // series length, so it can never read past 100%.
  const watched = status === "completed" && total !== null ? total : 0;

  try {
    const { db } = await import("@/db");

    await db
      .insert(userLibrary)
      .values({
        userId: user.id,
        animeId,
        title,
        image,
        status,
        statusLocked: true,
        episodesWatched: watched,
        totalEpisodes: total,
      })
      .onConflictDoUpdate({
        target: [userLibrary.userId, userLibrary.animeId],
        set: {
          status,
          statusLocked: true,
          totalEpisodes: sql`COALESCE(excluded.total_episodes, ${userLibrary.totalEpisodes})`,
          episodesWatched:
            status === "completed"
              ? sql`GREATEST(${userLibrary.episodesWatched}, COALESCE(excluded.total_episodes, ${userLibrary.totalEpisodes}, ${userLibrary.episodesWatched}))`
              : sql`${userLibrary.episodesWatched}`,
          image: sql`COALESCE(excluded.image, ${userLibrary.image})`,
          updatedAt: sql`now()`,
        },
      });

    revalidatePath("/library");
    return { ok: true, status };
  } catch (error) {
    console.error(
      "[library] setLibraryStatus failed:",
      (error as Error).message,
    );
    return { ok: false };
  }
}

/**
 * Takes an anime off the member's shelves (LIB-06). The watch history behind it
 * is left untouched — removing an entry is a filing decision, not a request to
 * forget what was watched — so re-watching an episode files it again.
 */
export async function removeFromLibrary(
  animeId: string,
): Promise<LibraryActionResult> {
  const user = await getCurrentUser();
  if (!user?.id) return { ok: false, unauthorized: true };

  const id = animeId?.trim();
  if (!id) return { ok: false };

  try {
    const { db } = await import("@/db");
    await db
      .delete(userLibrary)
      .where(and(eq(userLibrary.userId, user.id), eq(userLibrary.animeId, id)));

    revalidatePath("/library");
    return { ok: true, status: null };
  } catch (error) {
    console.error(
      "[library] removeFromLibrary failed:",
      (error as Error).message,
    );
    return { ok: false };
  }
}
