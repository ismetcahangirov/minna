import { NextResponse } from "next/server";

import { parseAnimeParam } from "@/lib/anime/href";
import type { AnimeUserState } from "@/lib/anime/user-state";
import { getCurrentUser } from "@/lib/auth/session";
import { isFavorite } from "@/lib/favorites/queries";
import { getLibraryEntry } from "@/lib/library/queries";
import { getAnimeWatchStates } from "@/lib/watch/queries";

/**
 * The viewer's own state for one anime (PERF-05).
 *
 * The detail, episodes and watch routes used to read all three of these during
 * render, which meant a session read, which meant the route could not be
 * prerendered or cached — every crawler hit rendered a personalised page for a
 * visitor that has no session at all. They are read here instead, by the client
 * islands that actually display them, so the HTML around them is the same for
 * everyone and the CDN can serve it.
 *
 * One route rather than three: the favorite button, the library menu, the
 * progress bar and the episode ticks all sit on the same page, so splitting
 * them would cost three requests where the queries are cheap, indexed and
 * already keyed by the same `(user, anime)` pair.
 *
 * Auth-guarded — this is per-user data. The client skips the request entirely
 * when the session endpoint says nobody is signed in, so a 401 here means a
 * cookie expired mid-visit, not an ordinary anonymous page view.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const animeId = parseAnimeParam(id);

  const [favorite, library, watch] = await Promise.all([
    isFavorite(user.id, animeId),
    getLibraryEntry(user.id, animeId),
    getAnimeWatchStates(user.id, animeId),
  ]);

  const state: AnimeUserState = { favorite, library, watch };
  return NextResponse.json(state);
}
