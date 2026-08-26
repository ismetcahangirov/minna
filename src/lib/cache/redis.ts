import "server-only";

/**
 * The render-path entry point to the Redis client.
 *
 * The client itself lives in `redis-client.ts`, which carries no `server-only`
 * marker, because the proxy needs it too: `src/proxy.ts` reads the canonical
 * anime slug registry before a request is routed, and Next bundles the proxy in
 * a layer where importing `server-only` throws. Everything rendering a page
 * keeps importing it through here, so the guard still covers the render path.
 */
export { getRedis } from "@/lib/cache/redis-client";
