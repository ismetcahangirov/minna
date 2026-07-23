import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { watchProgress } from "@/db/schema";
import type { WatchHistoryItem } from "@/lib/watch/types";

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

/** Per-episode watched/resume state for the episodes list (one anime). */
export interface EpisodeWatchState {
  completed: boolean;
  /** 0..1 fraction of the episode watched (1 when completed with no duration). */
  progress: number;
}

/**
 * All of the signed-in user's saved episode states for one anime, keyed by
 * episode id — used to mark the episodes list with "watched" ticks and resume
 * progress bars. Returns `{}` for signed-out users or on any failure so the
 * list still renders.
 */
export async function getAnimeWatchStates(
  userId: string,
  animeId: string,
): Promise<Record<string, EpisodeWatchState>> {
  if (!userId) return {};

  try {
    const { db } = await import("@/db");
    const rows = await db
      .select({
        episodeId: watchProgress.episodeId,
        positionSeconds: watchProgress.positionSeconds,
        durationSeconds: watchProgress.durationSeconds,
        completed: watchProgress.completed,
      })
      .from(watchProgress)
      .where(
        and(
          eq(watchProgress.userId, userId),
          eq(watchProgress.animeId, animeId),
        ),
      );

    const states: Record<string, EpisodeWatchState> = {};
    for (const row of rows) {
      const duration = row.durationSeconds ?? 0;
      const progress =
        duration > 0
          ? Math.min(1, Math.max(0, row.positionSeconds / duration))
          : row.completed
            ? 1
            : 0;
      states[row.episodeId] = { completed: row.completed, progress };
    }
    return states;
  } catch (error) {
    console.error(
      "[watch] getAnimeWatchStates failed:",
      (error as Error).message,
    );
    return {};
  }
}

/** Default number of items in the profile watch-history quick view. */
export const WATCH_HISTORY_LIMIT = 12;

/** Clamps the requested item count to a sane range. */
function safeLimit(limit: number): number {
  if (!Number.isFinite(limit) || limit < 1) return WATCH_HISTORY_LIMIT;
  return Math.min(Math.floor(limit), 60);
}

/**
 * The signed-in user's most recently watched episodes, newest first, for the
 * profile "continue watching" quick view (PROFILE-03). Collapsed to one entry
 * per anime (the latest episode touched) so the list reads as a resume list
 * rather than a raw event log.
 *
 * Over-fetches so de-duplication still fills `limit` distinct anime, then
 * derives a `progress` fraction from the stored position/duration. `@/db` is
 * imported dynamically so its `DATABASE_URL` requirement stays out of the
 * build-time module graph; any failure degrades to an empty list rather than
 * breaking the render.
 */
export async function listRecentWatchHistory(
  userId: string,
  limit: number = WATCH_HISTORY_LIMIT,
): Promise<WatchHistoryItem[]> {
  const count = safeLimit(limit);
  if (!userId) return [];

  try {
    const { db } = await import("@/db");
    const rows = await db
      .select({
        animeId: watchProgress.animeId,
        episodeId: watchProgress.episodeId,
        episodeNumber: watchProgress.episodeNumber,
        title: watchProgress.title,
        image: watchProgress.image,
        positionSeconds: watchProgress.positionSeconds,
        durationSeconds: watchProgress.durationSeconds,
        completed: watchProgress.completed,
        updatedAt: watchProgress.updatedAt,
      })
      .from(watchProgress)
      .where(eq(watchProgress.userId, userId))
      .orderBy(desc(watchProgress.updatedAt))
      .limit(count * 4);

    const seen = new Set<string>();
    const items: WatchHistoryItem[] = [];
    for (const row of rows) {
      if (seen.has(row.animeId)) continue;
      seen.add(row.animeId);

      const duration = row.durationSeconds ?? 0;
      const progress =
        duration > 0
          ? Math.min(1, Math.max(0, row.positionSeconds / duration))
          : 0;

      items.push({
        animeId: row.animeId,
        episodeId: row.episodeId,
        episodeNumber: row.episodeNumber,
        title: row.title,
        image: row.image,
        positionSeconds: row.positionSeconds,
        durationSeconds: row.durationSeconds,
        completed: row.completed,
        progress,
        updatedAt: row.updatedAt.toISOString(),
      });

      if (items.length >= count) break;
    }

    return items;
  } catch (error) {
    console.error(
      "[watch] listRecentWatchHistory failed:",
      (error as Error).message,
    );
    return [];
  }
}
