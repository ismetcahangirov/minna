import {
  animeChunk,
  blogsSection,
  pagesSection,
} from "@/lib/seo/sitemap-sections";
import { renderUrlset, xmlResponse } from "@/lib/seo/sitemap-xml";

/**
 * The child sitemaps listed by `/sitemap.xml`.
 *
 * One handler for every section, because they differ only in which enumeration
 * fills them — splitting them across files would duplicate the response shape
 * three times to save one `switch`.
 *
 * Served names:
 *
 * - `pages.xml` — the static routes. No I/O.
 * - `blogs.xml` — posts and tag archives. Database only, so a new post is
 *   crawlable without waiting behind a walk of the anime catalog.
 * - `anime-{n}.xml` — the catalog, chunked. This is 99% of the site's URLs
 *   (10,866 of 11,010 when the split was written), and the reason the single
 *   sitemap was too slow to be fetched at all.
 */
export const dynamic = "force-dynamic";

/** `anime-12.xml` → 12. Null for anything that is not that shape. */
function animeChunkIndex(file: string): number | null {
  const match = /^anime-(\d+)\.xml$/.exec(file);
  if (!match) return null;
  const index = Number(match[1]);
  return Number.isSafeInteger(index) ? index : null;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ file: string }> },
): Promise<Response> {
  const { file } = await context.params;

  if (file === "pages.xml") {
    return xmlResponse(renderUrlset(pagesSection()));
  }

  if (file === "blogs.xml") {
    return xmlResponse(renderUrlset(await blogsSection()));
  }

  const index = animeChunkIndex(file);
  if (index !== null) {
    const chunk = await animeChunk(index);
    // An index past the end is a stale entry in a crawler's copy of the index,
    // not a broken link — 404 so it stops asking, rather than serving an empty
    // set that looks like a section which legitimately has nothing in it.
    if (!chunk) return new Response("Not found", { status: 404 });
    return xmlResponse(renderUrlset(chunk.urls));
  }

  return new Response("Not found", { status: 404 });
}
