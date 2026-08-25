import "server-only";

import { sql } from "drizzle-orm";

export interface RecordLibraryProgressInput {
  userId: string;
  animeId: string;
  /** Denormalized so a shelf never calls the catalog to render. */
  title: string;
  image?: string | null;
  /** Episode count as the catalog reported it; null while unknown. */
  totalEpisodes?: number | null;
  /** Episode just watched, for the "continue from" line. */
  episodeNumber?: number | null;
  /** 1 the moment an episode first flips to completed, 0 otherwise. */
  completedDelta: 0 | 1;
}

/**
 * Files an anime on the member's library shelf and advances its watched counter
 * (LIB-02) — the automatic half of the library, called from the player's
 * progress writer.
 *
 * Deliberately rare: the watch route calls this only when a member starts an
 * episode they have never opened before, or when an episode first flips to
 * completed. The throttled position pings in between touch nothing here, so a
 * whole viewing session costs a couple of writes rather than one every fifteen
 * seconds.
 *
 * One statement does the whole job. The counter is incremented in place (never
 * recomputed with a COUNT), capped at the series length so the bar cannot pass
 * 100%, and the status is re-derived — unless `status_locked` says the member
 * chose it themselves, in which case their choice is left alone.
 */
export async function recordLibraryProgress(
  input: RecordLibraryProgressInput,
): Promise<void> {
  const { userId, animeId } = input;
  if (!userId || !animeId) return;

  const title = input.title?.trim() || "Untitled";
  const image = input.image?.trim() || null;
  const total =
    typeof input.totalEpisodes === "number" && input.totalEpisodes > 0
      ? Math.floor(input.totalEpisodes)
      : null;
  const episodeNumber =
    typeof input.episodeNumber === "number" && input.episodeNumber > 0
      ? Math.floor(input.episodeNumber)
      : null;
  const delta = input.completedDelta === 1 ? 1 : 0;

  try {
    const { db } = await import("@/db");

    await db.execute(sql`
      INSERT INTO user_library (
        user_id, anime_id, title, image, status,
        episodes_watched, total_episodes, last_episode_number
      )
      VALUES (
        ${userId}, ${animeId}, ${title}, ${image},
        CASE
          WHEN ${total}::int IS NOT NULL AND ${delta}::int >= ${total}::int
            THEN 'completed'::library_status
          ELSE 'watching'::library_status
        END,
        ${delta}, ${total}, ${episodeNumber}
      )
      ON CONFLICT (user_id, anime_id) DO UPDATE SET
        title = COALESCE(NULLIF(excluded.title, 'Untitled'), user_library.title),
        image = COALESCE(excluded.image, user_library.image),
        total_episodes = COALESCE(excluded.total_episodes, user_library.total_episodes),
        last_episode_number = GREATEST(
          COALESCE(user_library.last_episode_number, 0),
          COALESCE(excluded.last_episode_number, 0)
        ),
        episodes_watched = CASE
          WHEN COALESCE(excluded.total_episodes, user_library.total_episodes) IS NOT NULL
            THEN LEAST(
              user_library.episodes_watched + excluded.episodes_watched,
              COALESCE(excluded.total_episodes, user_library.total_episodes)
            )
          ELSE user_library.episodes_watched + excluded.episodes_watched
        END,
        status = CASE
          WHEN user_library.status_locked THEN user_library.status
          WHEN COALESCE(excluded.total_episodes, user_library.total_episodes) IS NOT NULL
           AND user_library.episodes_watched + excluded.episodes_watched
               >= COALESCE(excluded.total_episodes, user_library.total_episodes)
            THEN 'completed'::library_status
          ELSE 'watching'::library_status
        END,
        updated_at = now()
    `);
  } catch (error) {
    // The library is a side effect of watching — never let it break playback.
    console.error(
      "[library] recordLibraryProgress failed:",
      (error as Error).message,
    );
  }
}
