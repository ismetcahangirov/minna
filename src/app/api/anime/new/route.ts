import { NextResponse } from "next/server";

import { listRecentAnime } from "@/lib/anime/browse";

/**
 * New/Recent listing endpoint: the browser → server → Redis → Consumet
 * seam for the /new page's infinite scroll. The client requests pages through
 * RTK Query (see `store/api/browse-api.ts`); the cache/origin work happens here
 * via `listRecentAnime`, so the browser never touches Consumet directly.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);

  const result = await listRecentAnime(Number.isFinite(page) ? page : 1);
  return NextResponse.json(result);
}
