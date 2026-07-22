import { NextResponse } from "next/server";

import { getAnimeSection } from "@/lib/anime/catalog";
import { ANIME_SECTIONS, isAnimeSection } from "@/lib/anime/types";

/**
 * Section listing endpoint (HOME-07): the browser → server → Redis → Consumet
 * seam. Client code never calls Consumet directly; it hits this route through
 * RTK Query (see `store/api/anime-api.ts`), and the cache/origin work happens
 * here via `getAnimeSection`. Server components render the same data directly
 * (SSR) without going through HTTP.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ section: string }> },
) {
  const { section } = await params;

  if (!isAnimeSection(section)) {
    return NextResponse.json(
      { error: "Unknown section", allowed: ANIME_SECTIONS },
      { status: 404 },
    );
  }

  const results = await getAnimeSection(section);
  return NextResponse.json({ results });
}
