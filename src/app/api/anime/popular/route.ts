import { NextResponse } from "next/server";

import { listPopularAnime } from "@/lib/anime/browse";

/**
 * Popular listing endpoint (LIST-02): the browser → server → Redis → Consumet
 * seam for the Popular page's infinite scroll. The client requests pages through
 * RTK Query (see `store/api/browse-api.ts`); the cache/origin work happens here
 * via `listPopularAnime`, so the browser never touches Consumet directly.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);

  const result = await listPopularAnime(Number.isFinite(page) ? page : 1);
  return NextResponse.json(result);
}
