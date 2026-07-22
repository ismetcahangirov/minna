import "server-only";

import { getRedis } from "@/lib/cache/redis";

// Centralized TTLs (seconds). Fast-changing data gets short TTLs; near-static
// data gets long TTLs — see the consumet-data-fetching skill.
export const CACHE_TTL = {
  /** Newly added episodes / "latest" — changes often. */
  short: 60 * 5, // 5 minutes
  /** Home sections, popular/trending listings. */
  medium: 60 * 30, // 30 minutes
  /** Anime detail, categories — rarely change. */
  long: 60 * 60 * 24, // 24 hours
} as const;

/**
 * Readiness ping for the cache layer (DEPLOY-03). Distinguishes "no Redis
 * configured" (a valid state — the cache no-ops) from an actual connection
 * failure, so the readiness probe can report a degraded-but-optional cache
 * without failing the overall check.
 */
export async function cachePing(): Promise<"ok" | "unconfigured" | "error"> {
  const redis = getRedis();
  if (!redis) return "unconfigured";
  try {
    const reply = await redis.ping();
    return reply === "PONG" ? "ok" : "error";
  } catch (error) {
    console.error("[cache] ping failed:", (error as Error).message);
    return "error";
  }
}

/** Namespaced key builder to keep the Redis keyspace organized. */
export function cacheKey(
  namespace: string,
  ...parts: (string | number)[]
): string {
  return [namespace, ...parts].join(":");
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    const raw = await redis.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch (error) {
    console.error("[cache] get failed:", (error as Error).message);
    return null;
  }
}

export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds: number,
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch (error) {
    console.error("[cache] set failed:", (error as Error).message);
  }
}

export async function cacheDelete(...keys: string[]): Promise<void> {
  const redis = getRedis();
  if (!redis || keys.length === 0) return;
  try {
    await redis.del(...keys);
  } catch (error) {
    console.error("[cache] delete failed:", (error as Error).message);
  }
}

/**
 * Read-through cache. Returns the cached value on a hit; on a miss (or when
 * Redis is unavailable) it runs `producer`, stores the result, and returns it.
 * A cache-layer failure never prevents the origin call from resolving.
 */
export async function getOrSet<T>(
  key: string,
  ttlSeconds: number,
  producer: () => Promise<T>,
): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;

  const value = await producer();
  await cacheSet(key, value, ttlSeconds);
  return value;
}
