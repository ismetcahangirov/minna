"use server";

import { sql } from "drizzle-orm";

import { watchProgress } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";

export interface SaveWatchProgressInput {
  animeId: string;
  episodeId: string;
  episodeNumber?: number | null;
  positionSeconds: number;
  durationSeconds?: number | null;
  /** Denormalized anime title/poster for the profile history view (PROFILE-03). */
  title?: string | null;
  image?: string | null;
}

export interface SaveWatchProgressResult {
  ok: boolean;
  /** True when skipped because the viewer is signed out (progress is opt-in). */
  unauthenticated?: boolean;
}

/** An episode counts as "watched" once the viewer passes 90% of its runtime. */
const COMPLETION_RATIO = 0.9;

/**
 * Upserts the current user's watch progress for an episode (PLAYER-05).
 *
 * Called from the player on a throttled interval and on unload — never every
 * timeupdate. Signed-out viewers are a no-op (progress requires an account);
 * this returns quietly rather than erroring so playback is never interrupted.
 * The (user, episode) unique constraint makes this an in-place upsert.
 * `@/db` is imported dynamically to keep `DATABASE_URL` out of the build graph.
 */
export async function saveWatchProgress(
  input: SaveWatchProgressInput,
): Promise<SaveWatchProgressResult> {
  const user = await getCurrentUser();
  if (!user?.id) return { ok: false, unauthenticated: true };

  const animeId = input.animeId?.trim();
  const episodeId = input.episodeId?.trim();
  if (!animeId || !episodeId) return { ok: false };

  const position = Math.max(0, Math.floor(input.positionSeconds));
  const duration =
    typeof input.durationSeconds === "number" &&
    Number.isFinite(input.durationSeconds) &&
    input.durationSeconds > 0
      ? Math.floor(input.durationSeconds)
      : null;
  const completed =
    duration !== null && position >= duration * COMPLETION_RATIO;
  const title = input.title?.trim() || null;
  const image = input.image?.trim() || null;

  try {
    const { db } = await import("@/db");

    await db
      .insert(watchProgress)
      .values({
        userId: user.id,
        animeId,
        episodeId,
        episodeNumber: input.episodeNumber ?? null,
        positionSeconds: position,
        durationSeconds: duration,
        completed,
        title,
        image,
      })
      .onConflictDoUpdate({
        target: [watchProgress.userId, watchProgress.episodeId],
        set: {
          positionSeconds: position,
          durationSeconds: duration,
          completed,
          episodeNumber: input.episodeNumber ?? null,
          title,
          image,
          updatedAt: sql`now()`,
        },
      });

    return { ok: true };
  } catch (error) {
    console.error("[watch] saveProgress failed:", (error as Error).message);
    return { ok: false };
  }
}
