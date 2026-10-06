/**
 * Cache headers for a public, viewer-independent API response (PERF-06): the
 * CDN answers repeats of the same URL, so an infinite-scroll page or a repeated
 * search does not invoke a function per visitor.
 *
 * An empty list is never cached. The data layers degrade an upstream failure to
 * an empty result, and caching that would serve the outage for half an hour.
 */
export function publicApiCache(list: readonly unknown[]): HeadersInit {
  return {
    "Cache-Control":
      list.length > 0
        ? "public, max-age=0, s-maxage=1800, stale-while-revalidate=86400"
        : "no-store",
  };
}
