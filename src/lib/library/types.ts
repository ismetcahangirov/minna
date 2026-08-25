/**
 * A member's library entry as the UI consumes it (LIB-01).
 *
 * Every field is denormalized onto the `user_library` row when it is written,
 * so a shelf renders from one indexed query with no catalog round-trip.
 * `updatedAt` is an ISO string so the SSR-seeded first page and any JSON
 * pagination share one serializable shape.
 */
export interface LibraryEntry {
  animeId: string;
  title: string;
  image: string | null;
  status: LibraryStatus;
  /** True once the member picked the status themselves. */
  statusLocked: boolean;
  episodesWatched: number;
  totalEpisodes: number | null;
  lastEpisodeNumber: number | null;
  /** Fraction of the series finished (0–1), or null while the length is unknown. */
  progress: number | null;
  updatedAt: string;
}

/** The shelves a library entry can sit on. */
export const LIBRARY_STATUSES = [
  "watching",
  "completed",
  "on_hold",
  "dropped",
  "planned",
] as const;

export type LibraryStatus = (typeof LIBRARY_STATUSES)[number];

export function isLibraryStatus(value: string): value is LibraryStatus {
  return (LIBRARY_STATUSES as readonly string[]).includes(value);
}

/** How many entries a library page holds. */
export const LIBRARY_PAGE_SIZE = 24;

/** Entry counts per shelf, for the tab bar and the public profile summary. */
export type LibraryCounts = Record<LibraryStatus, number> & { total: number };

export const EMPTY_LIBRARY_COUNTS: LibraryCounts = {
  watching: 0,
  completed: 0,
  on_hold: 0,
  dropped: 0,
  planned: 0,
  total: 0,
};

/**
 * Derives the progress fraction shown on the bar. Null while the episode count
 * is unknown, so the UI can show a plain "N episodes" line instead of a bar
 * that would pretend to know how far along the member is.
 */
export function libraryProgress(
  episodesWatched: number,
  totalEpisodes: number | null,
): number | null {
  if (!totalEpisodes || totalEpisodes <= 0) return null;
  return Math.min(1, Math.max(0, episodesWatched / totalEpisodes));
}
