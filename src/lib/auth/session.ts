import "server-only";

import { cache } from "react";

import { auth } from "@/auth";

/**
 * Request-memoized read of the current session user for server components,
 * route handlers and the header. Returns `null` when signed out. Wrapping in
 * React `cache` dedupes the session decode across a single render pass, so
 * several callers (layout, header, page) share one result.
 */
export const getCurrentUser = cache(async () => {
  const session = await auth();
  return session?.user ?? null;
});
