import { NextResponse } from "next/server";

import { parseAnimeParam } from "@/lib/anime/href";
import { getCurrentUser } from "@/lib/auth/session";
import { getWatchProgress } from "@/lib/watch/queries";
import type { WatchProgressState } from "@/lib/watch/types";

/**
 * The viewer's saved position in one episode (PERF-05), read by the player
 * instead of being rendered into the page.
 *
 * Keyed by anime *and* episode, never the episode alone: the episode lists this
 * app plays from are synthesized and number every episode "1".."N", so an id
 * only identifies an episode within its own anime (#225).
 *
 * Auth-guarded like the rest of `/api/me`. The player skips the request when no
 * one is signed in, so a signed-out viewer costs nothing here.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ animeId: string; episodeId: string }> },
) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { animeId, episodeId } = await params;
  const progress = await getWatchProgress(
    user.id,
    parseAnimeParam(animeId),
    episodeId,
  );

  return NextResponse.json(progress satisfies WatchProgressState | null);
}
