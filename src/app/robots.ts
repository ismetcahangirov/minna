import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/seo/site";

/**
 * `robots.txt` (PERF-01). Crawlers may index the public catalogue but are kept
 * out of the admin panel, API routes, and per-user pages (auth-gated, no SEO
 * value). Points bots at the generated sitemap.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api", "/profile", "/favorites"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
