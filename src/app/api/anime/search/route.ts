import { NextResponse } from "next/server";

import { searchAnime } from "@/lib/anime/search";

/**
 * Search endpoint (SEARCH-01): the browser → server → Redis → Consumet seam for
 * the search page. The client's debounced input hits this route through RTK
 * Query (see `store/api/search-api.ts`); the cache/origin work happens here in
 * `searchAnime`, so the browser never touches Consumet directly.
 *
 * Query params:
 *  - `q`     free-text title query
 *  - `genre` repeatable genre facet (`?genre=Action&genre=Comedy`)
 *  - `page`  1-based page for load-more pagination
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const query = searchParams.get("q") ?? "";
  const genres = searchParams.getAll("genre");
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);

  const result = await searchAnime({
    query,
    genres,
    page: Number.isFinite(page) ? page : 1,
  });

  return NextResponse.json(result);
}
