import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { listFavorites } from "@/lib/favorites/queries";

/**
 * Favorites listing endpoint (LIST-04): the browser → server → Neon seam for the
 * Favorites page's infinite scroll. Auth-guarded — favorites are per-user, so an
 * unauthenticated request gets 401 (the page itself gates on the session and
 * only calls this when signed in). The client requests pages through RTK Query
 * (see `store/api/browse-api.ts`).
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);

  const result = await listFavorites(user.id, Number.isFinite(page) ? page : 1);
  return NextResponse.json(result);
}
