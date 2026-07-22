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

/** Joins a root-relative path onto the site origin, e.g. `/blogs` → absolute. */
export function absoluteUrl(path: string): string {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${getSiteUrl()}${suffix}`;
}
