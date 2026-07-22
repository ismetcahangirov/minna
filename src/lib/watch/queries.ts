import "server-only";

import { and, eq } from "drizzle-orm";

import { watchProgress } from "@/db/schema";

/** Resume state for one episode (PLAYER-05). */
export interface WatchProgressState {
  positionSeconds: number;
  durationSeconds: number | null;
  completed: boolean;
}

/**
 * The signed-in user's saved progress for `episodeId` (PLAYER-05), used to seed
 * the player so it resumes where the viewer left off. Returns `null` when there
 * is no saved position.
 *
 * `@/db` is imported dynamically so its `DATABASE_URL` requirement stays out of
 * the build-time module graph. Any failure degrades to `null` (start from the
 * beginning) rather than breaking the render.
 */
export async function getWatchProgress(
  userId: string,
  episodeId: string,
): Promise<WatchProgressState | null> {
  try {
    const { db } = await import("@/db");
    const rows = await db
      .select({
        positionSeconds: watchProgress.positionSeconds,
        durationSeconds: watchProgress.durationSeconds,
        completed: watchProgress.completed,
      })
      .from(watchProgress)
      .where(
        and(
          eq(watchProgress.userId, userId),
          eq(watchProgress.episodeId, episodeId),
        ),
      )
      .limit(1);

    return rows[0] ?? null;
  } catch (error) {
    console.error("[watch] getProgress failed:", (error as Error).message);
    return null;
  }
}
