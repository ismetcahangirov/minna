"use server";

import { sql } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth/session";
import { recordLibraryProgress } from "@/lib/library/record";

export interface SaveWatchProgressInput {
  animeId: string;
  episodeId: string;
  episodeNumber?: number | null;
  positionSeconds: number;
  durationSeconds?: number | null;
  /** Denormalized anime title/poster for the profile history view (PROFILE-03). */
  title?: string | null;
  image?: string | null;
  /** Series length, denormalized onto the library entry for its progress bar. */
  totalEpisodes?: number | null;
}

export interface SaveWatchProgressResult {
  ok: boolean;
  /** True when skipped because the viewer is signed out (progress is opt-in). */
  unauthenticated?: boolean;
}

/** An episode counts as "watched" once the viewer passes 90% of its runtime. */
const COMPLETION_RATIO = 0.9;

/** Reads the rows out of a raw driver result, whichever shape it arrives in. */
function firstRow(result: unknown): Record<string, unknown> | undefined {
  if (Array.isArray(result)) return result[0] as Record<string, unknown>;
  const rows = (result as { rows?: unknown[] })?.rows;
  return Array.isArray(rows) ? (rows[0] as Record<string, unknown>) : undefined;
}

/**
 * Upserts the current user's watch progress for an episode (PLAYER-05) and
 * keeps their library in step (LIB-02).
 *
 * Called from the player on a throttled interval and on unload — never every
 * timeupdate. Signed-out viewers are a no-op (progress requires an account);
 * this returns quietly rather than erroring so playback is never interrupted.
 *
 * The upsert runs as one statement whose CTE also reports two transitions the
 * plain upsert could not: whether this is the first time the viewer opened the
 * episode, and whether it just flipped to completed. Only those two moments
 * touch `user_library` — the fifteen-second position pings in between cost a
 * single write, which is what keeps a viewing session cheap on a free-tier
 * database.
 *
 * Completion is sticky (`completed OR excluded.completed`): re-watching an
 * episode from the start must not un-watch it and then count it a second time
 * when it finishes again, which would drift the library's episode counter.
 *
 * The conflict target is (user, anime, episode), never (user, episode): an
 * episode id is unique only within its own anime — the synthesized lists this
 * app plays from number every episode "1".."N" — so the narrower key made
 * episode 12 of one anime overwrite episode 12 of another. See `watchProgress`
 * in `@/db/schema`.
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
  const episodeNumber = input.episodeNumber ?? null;
  const title = input.title?.trim() || null;
  const image = input.image?.trim() || null;

  try {
    const { db } = await import("@/db");

    const result = await db.execute(sql`
      WITH previous AS (
        SELECT completed
        FROM watch_progress
        WHERE user_id = ${user.id}
          AND anime_id = ${animeId}
          AND episode_id = ${episodeId}
      ), upserted AS (
        INSERT INTO watch_progress (
          user_id, anime_id, episode_id, episode_number,
          position_seconds, duration_seconds, completed, title, image
        )
        VALUES (
          ${user.id}, ${animeId}, ${episodeId}, ${episodeNumber},
          ${position}, ${duration}, ${completed}, ${title}, ${image}
        )
        ON CONFLICT (user_id, anime_id, episode_id) DO UPDATE SET
          position_seconds = excluded.position_seconds,
          duration_seconds = COALESCE(excluded.duration_seconds, watch_progress.duration_seconds),
          completed = watch_progress.completed OR excluded.completed,
          episode_number = COALESCE(excluded.episode_number, watch_progress.episode_number),
          title = COALESCE(excluded.title, watch_progress.title),
          image = COALESCE(excluded.image, watch_progress.image),
          updated_at = now()
        RETURNING (xmax = 0) AS inserted, completed
      )
      SELECT
        (SELECT inserted FROM upserted) AS inserted,
        (SELECT completed FROM upserted) AS now_completed,
        COALESCE((SELECT completed FROM previous), false) AS was_completed
    `);

    const row = firstRow(result);
    const inserted = row?.inserted === true;
    const justCompleted =
      row?.now_completed === true && row?.was_completed !== true;

    // Only the two transitions reach the library: first open of an episode
    // (files the anime on the "watching" shelf) and first completion (advances
    // the counter behind the progress bar).
    if (inserted || justCompleted) {
      await recordLibraryProgress({
        userId: user.id,
        animeId,
        title: title ?? "Untitled",
        image,
        totalEpisodes: input.totalEpisodes ?? null,
        episodeNumber,
        completedDelta: justCompleted ? 1 : 0,
      });
    }

    return { ok: true };
  } catch (error) {
    console.error("[watch] saveProgress failed:", (error as Error).message);
    return { ok: false };
  }
}
