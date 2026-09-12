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
 * Crawlers refused the whole site (PERF-05).
 *
 * Every one of these is an SEO or market-intelligence bot: they index nothing a
 * reader can find us through, and they crawl hard — a request is a request
 * whether the page was served from the cache or rendered, and Edge Requests are
 * the one allowance caching does nothing for. The site had a single
 * `User-agent: *` group, which let all of them in.
 *
 * Search and AI crawlers are deliberately absent from this list. Googlebot,
 * Bingbot and the AI assistants that cite their sources all send readers back;
 * blocking them to save requests would be saving the wrong thing.
 *
 * The polite ones stop here. The rest ignore `robots.txt` entirely and have to
 * be refused at the edge instead — see the issue for what Vercel's firewall
 * offers on the current plan.
 */
const UNWANTED_CRAWLERS = [
  "AhrefsBot",
  "SemrushBot",
  "MJ12bot",
  "DotBot",
  "DataForSeoBot",
  "PetalBot",
  "Bytespider",
  "ImagesiftBot",
  "SeekportBot",
  "Timpibot",
  "VelenPublicWebCrawler",
  "magpie-crawler",
];

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
    rules: [
      { userAgent: "*", allow: "/", disallow },
      { userAgent: UNWANTED_CRAWLERS, disallow: "/" },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
