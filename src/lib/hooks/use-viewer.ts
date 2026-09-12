"use client";

import {
  EMPTY_ANIME_USER_STATE,
  type AnimeUserState,
} from "@/lib/anime/user-state";
import type { SessionUser } from "@/lib/auth/session-user";
import {
  useGetAnimeUserStateQuery,
  useGetWatchProgressQuery,
} from "@/store/api/me-api";
import { useGetSessionQuery } from "@/store/api/session-api";
import type { WatchProgressState } from "@/lib/watch/types";

/**
 * The signed-in viewer, as a client island sees them (PERF-05).
 *
 * Three states, not two, and the difference matters: until the session request
 * lands nothing is known, and a control that guesses "signed out" in the
 * meantime flashes a Login button at a member on every page load. `known` is
 * what tells the two apart — render neither state until it is true.
 */
export interface Viewer {
  user: SessionUser | null;
  isAuthenticated: boolean;
  /** False while the session request is still in flight. */
  known: boolean;
}

/**
 * Reads the session in the browser rather than during render, so the page
 * around the island stays identical for every visitor and can be cached at the
 * edge (see `@/store/api/session-api` for why that matters). Every island on a
 * page shares the one in-flight request.
 */
export function useViewer(): Viewer {
  const { data } = useGetSessionQuery();
  return {
    user: data ?? null,
    isAuthenticated: Boolean(data),
    known: data !== undefined,
  };
}

/** {@link useAnimeUserState}'s return: the viewer, plus what they did here. */
export interface AnimeViewerState extends Viewer {
  state: AnimeUserState;
  /** True once the state below is the viewer's own, not the empty default. */
  loaded: boolean;
}

/**
 * What the signed-in viewer has done with one anime — favorited it, filed it,
 * watched episodes of it — for the islands on the detail and episodes routes.
 *
 * Skipped entirely while signed out (and while that is still unknown), so an
 * anonymous reader makes one session request and nothing else. All four islands
 * on the detail page share this one request through RTK Query's cache.
 */
export function useAnimeUserState(animeId: string): AnimeViewerState {
  const viewer = useViewer();
  const { data } = useGetAnimeUserStateQuery(animeId, {
    skip: !viewer.isAuthenticated,
    // Every mutation that changes this — favoriting, filing a title, finishing
    // an episode — is a server action, so it writes without going through RTK
    // Query and cannot invalidate its tags. Refetching whenever an island
    // mounts is what keeps a client-side navigation back to a page from showing
    // the state as it was before the write.
    refetchOnMountOrArgChange: true,
  });

  return {
    ...viewer,
    state: data ?? EMPTY_ANIME_USER_STATE,
    loaded: data !== undefined,
  };
}

/**
 * The viewer's resume position in one episode, for the player. Keyed by anime
 * *and* episode: episode ids are only unique within their own anime (#225).
 */
export function useWatchProgress(
  animeId: string,
  episodeId: string,
): { progress: WatchProgressState | null; loaded: boolean } & Viewer {
  const viewer = useViewer();
  const { data } = useGetWatchProgressQuery(
    { animeId, episodeId },
    // Written by a server action (`saveWatchProgress`), so RTK never learns it
    // changed — see {@link useAnimeUserState}.
    { skip: !viewer.isAuthenticated, refetchOnMountOrArgChange: true },
  );

  return { ...viewer, progress: data ?? null, loaded: data !== undefined };
}
