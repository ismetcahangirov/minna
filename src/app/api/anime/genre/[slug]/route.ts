import { NextResponse } from "next/server";

import { listGenreAnime } from "@/lib/anime/browse";
import { ANIME_GENRES } from "@/lib/anime/genres";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);

  const result = await listGenreAnime(slug, Number.isFinite(page) ? page : 1);
  if (!result) {
    return NextResponse.json(
      { error: "Unknown genre", allowed: ANIME_GENRES },
      { status: 404 },
    );
  }

  return NextResponse.json(result);
}
