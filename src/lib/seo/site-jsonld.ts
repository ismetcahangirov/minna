import type { JsonLdData } from "@/components/seo/json-ld";
import { getSiteUrl } from "@/lib/seo/site";

/**
 * Site-wide structured data (PERF-01), emitted once in the root layout:
 *
 * - `WebSite` with a `SearchAction` — makes Minna eligible for the Google
 *   sitelinks search box, letting users search the site straight from results.
 * - `Organization` — associates the brand name/site with the domain.
 */
export function buildSiteJsonLd(): JsonLdData {
  const origin = getSiteUrl();

  return [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Minna",
      url: origin,
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
      name: "Minna",
      url: origin,
    },
  ];
}
