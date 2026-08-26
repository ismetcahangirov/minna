import type { MetadataRoute } from "next";

import { locales } from "@/i18n/config";
import { localePath } from "@/i18n/paths";
import { absoluteUrl } from "@/lib/seo/site";

/**
 * Path prefixes crawlers are kept out of: the admin panel and the per-user
 * pages, which are auth-gated and have no SEO value.
 *
 * `/api` is deliberately absent from this list — it takes no locale prefix, so
 * it is added once below rather than three times.
 */
const PRIVATE_PREFIXES = ["/admin", "/profile", "/favorites"];

/**
 * `robots.txt` (PERF-01 / I18N-05).
 *
 * Each private prefix is listed once per locale, because a `Disallow` is a
 * literal path prefix: `/admin` alone stops nothing at `/tr/admin`, and the
 * admin panel is reachable at all three now that the locale is in the URL.
 */
export default function robots(): MetadataRoute.Robots {
  const disallow = [
    "/api",
    ...PRIVATE_PREFIXES.flatMap((prefix) =>
      locales.map((locale) => localePath(prefix, locale)),
    ),
  ];

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow,
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
