import { animeChunkCount } from "@/lib/seo/sitemap-sections";
import { renderSitemapIndex, xmlResponse } from "@/lib/seo/sitemap-xml";
import { absoluteUrl } from "@/lib/seo/site";

/**
 * `/sitemap.xml` — the sitemap index (PERF-01).
 *
 * A route handler rather than Next's `sitemap.ts` convention, because that
 * convention can only emit a `<urlset>`; there is no way to produce a
 * `<sitemapindex>` through it.
 *
 * This document is deliberately the cheapest thing on the site: a list of
 * filenames and one small Redis read for the catalog's chunk count. It is the
 * file every crawler fetches first, and the reason the sitemap was split at all
 * was that the single document took 90–110 seconds to build — long enough that
 * a crawler abandons it, which leaves every URL inside it undiscovered.
 *
 * `robots.txt` points here, and a sitemap index is a valid target for it.
 */
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const chunks = await animeChunkCount();
  const lastModified = new Date();

  const children = [
    absoluteUrl("/sitemaps/pages.xml"),
    absoluteUrl("/sitemaps/blogs.xml"),
    ...Array.from({ length: chunks }, (_, index) =>
      absoluteUrl(`/sitemaps/anime-${index}.xml`),
    ),
  ];

  return xmlResponse(
    renderSitemapIndex(children.map((url) => ({ url, lastModified }))),
  );
}
