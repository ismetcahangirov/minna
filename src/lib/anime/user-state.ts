import type { LibraryEntry } from "@/lib/library/types";
import type { EpisodeWatchState } from "@/lib/watch/types";

/**
 * Everything the anime pages render about the signed-in viewer, in one shape
 * (PERF-05): whether the title is favorited, the library row behind the status
 * menu and progress bar, and the per-episode ticks on the episode list.
 *
 * Served by `/api/me/anime/[id]` and read by the client islands that display
 * it — none of it is rendered on the server any more, which is what lets the
 * detail page itself be cached at the edge. A standalone module rather than a
 * type exported from the route: the islands are client components, and the
 * route's own imports are `server-only`.
 */
export interface AnimeUserState {
  favorite: boolean;
  library: LibraryEntry | null;
  /** Watched/resume state per episode id. Empty when nothing was watched. */
  watch: Record<string, EpisodeWatchState>;
}

/** What the islands render before the request lands, and if it fails. */
export const EMPTY_ANIME_USER_STATE: AnimeUserState = {
  favorite: false,
  library: null,
  watch: {},
};
