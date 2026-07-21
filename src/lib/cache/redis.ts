import "server-only";

import Redis from "ioredis";

// Reuse a single connection across serverless invocations. Next.js/Vercel
// reuses the module scope between warm invocations, so caching the client on
// globalThis avoids opening a new TCP connection per request.
const globalForRedis = globalThis as unknown as {
  redis: Redis | null | undefined;
};

function createRedis(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) {
    // No Redis configured (e.g. local dev without it) — caching becomes a
    // no-op and callers fall through to the origin. See getOrSet().
    return null;
  }

  const client = new Redis(url, {
    // Serverless-friendly: fail fast instead of buffering commands forever
    // while a connection is down, and cap reconnection attempts.
    maxRetriesPerRequest: 2,
    enableOfflineQueue: false,
    lazyConnect: false,
    retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 1000)),
  });

  client.on("error", (error) => {
    // Never let a cache-layer failure crash a request; just log it.
    console.error("[redis] connection error:", error.message);
  });

  return client;
}

export function getRedis(): Redis | null {
  if (globalForRedis.redis === undefined) {
    globalForRedis.redis = createRedis();
  }
  return globalForRedis.redis;
}
