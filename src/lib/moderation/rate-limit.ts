import "server-only";

import { getRedis } from "@/lib/cache/redis";

/**
 * Redis-backed write throttle for the community features (COMM-06).
 *
 * Spam control lives in Redis rather than Postgres on purpose: the free-tier
 * database should never be asked to count a member's recent posts before every
 * insert. A fixed window is enough here — the goal is to stop a flood, not to
 * meter an API.
 *
 * When Redis is not configured (local dev) the limiter fails open, exactly like
 * the cache layer: an optional dependency must never block a legitimate write.
 */

/** Bounds a member may not exceed when writing to the community. */
export const RATE_LIMITS = {
  /** New threads are heavier than replies — one every few minutes. */
  thread: { limit: 5, windowSeconds: 60 * 10 },
  /** Replies and episode reviews. */
  post: { limit: 10, windowSeconds: 60 },
} as const;

export type RateLimitKind = keyof typeof RATE_LIMITS;

/**
 * Counts one write against `userId`'s window and reports whether it is allowed.
 * The first call in a window sets the key's expiry, so the counter clears
 * itself without any sweep.
 */
export async function consumeRateLimit(
  kind: RateLimitKind,
  userId: string,
): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return true;

  const { limit, windowSeconds } = RATE_LIMITS[kind];
  const key = `ratelimit:${kind}:${userId}`;

  try {
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, windowSeconds);
    return count <= limit;
  } catch (error) {
    console.error("[moderation] rate limit failed:", (error as Error).message);
    return true;
  }
}
