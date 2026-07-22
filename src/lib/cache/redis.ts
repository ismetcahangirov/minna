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
    // Serverless cold starts race the TLS handshake: the first cache call
    // fires before the socket is ready. With `enableOfflineQueue: false` that
    // rejected instantly ("Stream isn't writeable"), so caching silently
    // no-op'd on every cold invocation and every request fell through to the
    // origin — which promptly got AniList-rate-limited (429). Queue commands
    // until the connection is ready instead, bounded by connectTimeout so a
    // genuinely-down Redis still fails fast rather than hanging.
    maxRetriesPerRequest: 3,
    enableOfflineQueue: true,
    connectTimeout: 10_000,
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
