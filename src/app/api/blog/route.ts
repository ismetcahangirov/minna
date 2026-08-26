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

  // The caller states the locale, because this route cannot infer it: a fetch
  // from `/tr/blogs` is still a request to `/api/blog`, a path with no locale
  // segment, and the proxy deliberately does not run on `/api`. Without it a
  // scrolled page would silently switch to the default-language selection
  // halfway down the list. `getLocale()` is only the fallback for a caller that
  // sends nothing.
  const requested = searchParams.get("locale") ?? undefined;
  const locale = isLocale(requested) ? requested : await getLocale();
  const result = await listBlogs(
    Number.isFinite(page) ? page : 1,
    isLocale(locale) ? locale : undefined,
  );
  return NextResponse.json(result);
}
