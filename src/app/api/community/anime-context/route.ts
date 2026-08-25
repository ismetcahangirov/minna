import { NextResponse } from "next/server";

import { getAnimeInfo } from "@/lib/anime/detail";
import { parseAnimeParam } from "@/lib/anime/href";
import { getAnimeSeasons } from "@/lib/anime/seasons";

/**
 * Everything the "start a discussion" form needs once a member has picked an
 * anime (COMM-01): how many episodes it has, and which seasons it belongs to.
 *
 * Both come from the same Redis-cached layer the detail page uses, so opening
 * the form usually re-reads cache rather than the catalog, and the browser
 * makes one request instead of two.
 *
 * Lives under `/api/community` rather than `/api/anime/{id}` because that path
 * already carries a differently-named dynamic segment (`[section]`), which
 * Next.js does not allow to vary at one level.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id") ?? "";

  const detail = id ? await getAnimeInfo(parseAnimeParam(id)) : null;
  if (!detail) {
    return NextResponse.json(
      { totalEpisodes: null, seasons: [] },
      { status: 404 },
    );
  }

  const seasons = await getAnimeSeasons(detail);

  return NextResponse.json({
    totalEpisodes: detail.totalEpisodes ?? detail.episodes.length ?? null,
    seasons: seasons.map((season) => ({
      id: season.id,
      title: season.title,
      kind: season.kind,
      index: season.index,
    })),
  });
}
