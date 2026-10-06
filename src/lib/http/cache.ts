/**
 * For public, viewer-independent API responses (PERF-06): the CDN answers
 * repeats of the same URL, so an infinite-scroll page or a repeated search does
 * not invoke a function per visitor.
 */
export const PUBLIC_API_CACHE = {
  "Cache-Control":
    "public, max-age=0, s-maxage=1800, stale-while-revalidate=86400",
} as const;
