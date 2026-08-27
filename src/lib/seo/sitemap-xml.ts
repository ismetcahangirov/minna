import "server-only";

/**
 * Sitemap XML serialization.
 *
 * Next's `sitemap.ts` convention only ever emits a `<urlset>`; there is no
 * built-in way to produce the `<sitemapindex>` that splitting a sitemap
 * requires. Both documents are written here instead, so the index and the
 * children it points at cannot drift apart in escaping or date format.
 */

/** One `<url>` entry. Mirrors the fields Next's `MetadataRoute.Sitemap` takes. */
export interface SitemapUrl {
  url: string;
  lastModified?: Date | string;
  changeFrequency?:
    "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
  /** `hreflang` tag → absolute URL, including `x-default` when it applies. */
  alternates?: Record<string, string>;
}

/** One `<sitemap>` entry in the index. */
export interface SitemapIndexEntry {
  url: string;
  lastModified?: Date | string;
}

/**
 * Escapes the five XML predefined entities.
 *
 * `&` matters most and is the easy one to forget: a URL carrying a query string
 * (`?page=2&sort=x`) produces a document that is not well-formed, and a crawler
 * rejects the whole file rather than the one entry.
 */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** W3C datetime, the only `lastmod` format the sitemap protocol accepts. */
function isoDate(value: Date | string): string {
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}

function renderUrl(entry: SitemapUrl): string {
  const parts = [`    <loc>${escapeXml(entry.url)}</loc>`];

  // Alternates come first among the optional children by convention; order is
  // not significant to the schema, but keeping it stable keeps diffs readable.
  for (const [hreflang, href] of Object.entries(entry.alternates ?? {})) {
    parts.push(
      `    <xhtml:link rel="alternate" hreflang="${escapeXml(hreflang)}" href="${escapeXml(href)}"/>`,
    );
  }

  if (entry.lastModified) {
    parts.push(`    <lastmod>${isoDate(entry.lastModified)}</lastmod>`);
  }
  if (entry.changeFrequency) {
    parts.push(`    <changefreq>${entry.changeFrequency}</changefreq>`);
  }
  if (entry.priority !== undefined) {
    parts.push(`    <priority>${entry.priority}</priority>`);
  }

  return `  <url>\n${parts.join("\n")}\n  </url>`;
}

/**
 * A `<urlset>` document.
 *
 * The `xhtml` namespace is declared only when something in the set actually
 * uses it — an unused declaration is valid but is noise on every one of these
 * files, and the anime sets carry thousands of entries.
 */
export function renderUrlset(entries: SitemapUrl[]): string {
  const needsXhtml = entries.some(
    (entry) => Object.keys(entry.alternates ?? {}).length > 0,
  );
  const xhtml = needsXhtml ? ' xmlns:xhtml="http://www.w3.org/1999/xhtml"' : "";

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${xhtml}>`,
    ...entries.map(renderUrl),
    "</urlset>",
    "",
  ].join("\n");
}

/** A `<sitemapindex>` document — the list of child sitemaps. */
export function renderSitemapIndex(entries: SitemapIndexEntry[]): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map((entry) => {
      const lastmod = entry.lastModified
        ? `\n    <lastmod>${isoDate(entry.lastModified)}</lastmod>`
        : "";
      return `  <sitemap>\n    <loc>${escapeXml(entry.url)}</loc>${lastmod}\n  </sitemap>`;
    }),
    "</sitemapindex>",
    "",
  ].join("\n");
}

/** The response every sitemap route returns. */
export function xmlResponse(body: string): Response {
  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      // Crawlers refetch a sitemap often; let the edge answer most of those.
      "Cache-Control":
        "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
