import type { JsonLdData } from "@/components/seo/json-ld";
import { getSiteUrl } from "@/lib/seo/site";

/**
 * Site-wide structured data (PERF-01), emitted once in the root layout:
 *
 * - `WebSite` with a `SearchAction` — makes Minna eligible for the Google
 *   sitelinks search box, letting users search the site straight from results.
 * - `Organization` — associates the brand name/site with the domain.
 *
 * The two nodes carry `@id`s and the site names its publisher, so a crawler
 * reads them as one entity called Minna rather than two loose claims. Search
 * engines only treat the name as the site's when it agrees across every
 * source, so it must match `og:site_name`, the manifest and the home page
 * title exactly.
 */
export function buildSiteJsonLd(): JsonLdData {
  const origin = getSiteUrl();
  const websiteId = `${origin}/#website`;
  const organizationId = `${origin}/#organization`;

  return [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": websiteId,
      name: "Minna",
      alternateName: "Minna — Watch Anime Online",
      url: `${origin}/`,
      publisher: { "@id": organizationId },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${origin}/search?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": organizationId,
      name: "Minna",
      url: `${origin}/`,
    },
  ];
}
