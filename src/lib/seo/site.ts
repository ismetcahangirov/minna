/**
 * Canonical site URL helpers (PERF-01).
 *
 * A single source of truth for the deployment's public origin, used by
 * `metadataBase` (root layout), the sitemap and robots routes, and any
 * absolute-URL construction. Reads `NEXT_PUBLIC_SITE_URL` and falls back to
 * localhost so builds and local dev never crash on a missing value.
 */

const FALLBACK_SITE_URL = "http://localhost:3000";

/** The public origin without a trailing slash, e.g. `https://minna.app`. */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const value = raw && raw.length > 0 ? raw : FALLBACK_SITE_URL;
  return value.replace(/\/+$/, "");
}

/** `getSiteUrl()` as a `URL`, suitable for Next's `metadataBase`. */
export function getSiteUrlObject(): URL {
  return new URL(getSiteUrl());
}

/**
 * Joins a root-relative path onto the site origin, e.g. `/blogs` → absolute.
 *
 * The home page is the one special case. Next resolves a `"/"` canonical
 * against `metadataBase` and renders it *without* a trailing slash, so this
 * matches that form and the two agree wherever both are emitted — the article
 * breadcrumbs, `host` in robots.txt. (`sitemap.xml` is the exception: Next
 * re-normalises every `<loc>` through the URL constructor, which puts the slash
 * back. `https://site` and `https://site/` are the same URL, so that costs
 * nothing — but it is why this cannot be fixed there.)
 */
export function absoluteUrl(path: string): string {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return suffix === "/" ? getSiteUrl() : `${getSiteUrl()}${suffix}`;
}
