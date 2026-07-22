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
