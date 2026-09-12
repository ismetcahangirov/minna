/**
 * Resume state for one episode (PLAYER-05).
 *
 * Declared here rather than beside the query that reads it: the player reads
 * its own resume position in the browser now (see `@/store/api/me-api`), so the
 * shape has to be importable from a client island — and `@/lib/watch/queries`
 * is `server-only`.
 */
export interface WatchProgressState {
  positionSeconds: number;
  durationSeconds: number | null;
  completed: boolean;
}

/** Per-episode watched/resume state for an episode list (one anime). */
export interface EpisodeWatchState {
  completed: boolean;
  /** 0..1 fraction of the episode watched (1 when completed with no duration). */
  progress: number;
}

/**
 * A recently-watched episode as shown in the profile watch-history quick view
 * (PROFILE-03). `title`/`image` are denormalized onto the `watch_progress` row
 * at save time (like {@link import("@/lib/favorites/types").FavoriteItem}), so
 * the history renders without a Consumet round-trip. `updatedAt` is an ISO
 * string so the SSR-rendered view shares one serializable shape with any JSON
 * API. `progress` is the fraction watched (0–1) when the runtime is known.
 */
export interface WatchHistoryItem {
  animeId: string;
  episodeId: string;
  episodeNumber: number | null;
  title: string | null;
  image: string | null;
  positionSeconds: number;
  durationSeconds: number | null;
  completed: boolean;
  progress: number;
  updatedAt: string;
}
