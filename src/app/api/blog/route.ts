import { NextResponse } from "next/server";

import { getLocale } from "next-intl/server";

import { isLocale } from "@/i18n/config";
import { listBlogs } from "@/lib/blog/queries";

/**
 * Blog listing endpoint (LIST-03): the browser → server → Neon seam for the
 * Blogs page's infinite scroll. The client requests pages through RTK Query
 * (see `store/api/browse-api.ts`); `listBlogs` owns the DB access here.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);

  // The reader's locale rides on the same cookie the pages read, so a scrolled
  // page keeps showing the same language selection the first one did.
  const locale = await getLocale();
  const result = await listBlogs(
    Number.isFinite(page) ? page : 1,
    isLocale(locale) ? locale : undefined,
  );
  return NextResponse.json(result);
}
