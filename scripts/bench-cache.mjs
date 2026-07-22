#!/usr/bin/env node
// @ts-check
/**
 * Redis cache-strategy performance benchmark (PERF-04).
 *
 * Exercises the read-through cache strategy from `src/lib/cache/cache.ts`
 * (namespaced keys, JSON serialization, `SET … EX <ttl>`, `GET` + `JSON.parse`)
 * against a real Redis and reports the latency distribution of cache HITs vs
 * cache MISSes plus the effective speedup over the origin.
 *
 *   node scripts/bench-cache.mjs
 *   npm run bench:cache -- --keys=500 --origin-latency=180
 *
 * Flags (all optional):
 *   --keys=N              number of distinct keys to exercise      (default 200)
 *   --origin-latency=MS   simulated origin (Consumet) latency, ms  (default 150)
 *   --ttl=SEC             TTL used for SET, seconds                 (default 300)
 *   --payload=BYTES       approx. JSON payload size per key        (default 4096)
 *
 * Requires `REDIS_URL`. Without it the benchmark still runs against an
 * in-process Map shim so the read-through logic and relative speedup are
 * visible, but the numbers are clearly labelled SIMULATED — real Redis
 * round-trips are what this test exists to measure.
 *
 * NOTE: keep the cache operations here in sync with src/lib/cache/cache.ts.
 */
import { config } from "dotenv";
import Redis from "ioredis";

// Load env the same way drizzle.config.ts does, preferring .env.local.
config({ path: ".env.local" });
config();

const NAMESPACE = "bench";

function parseArgs(argv) {
  const opts = {
    keys: 200,
    originLatency: 150,
    ttl: 300,
    payload: 4096,
  };
  for (const arg of argv) {
    const match = /^--([a-z-]+)=(\d+)$/.exec(arg);
    if (!match) continue;
    const [, key, raw] = match;
    const value = Number(raw);
    if (key === "keys") opts.keys = value;
    else if (key === "origin-latency") opts.originLatency = value;
    else if (key === "ttl") opts.ttl = value;
    else if (key === "payload") opts.payload = value;
  }
  return opts;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Namespaced key builder — mirrors cacheKey() in the app. */
function cacheKey(...parts) {
  return [NAMESPACE, ...parts].join(":");
}

/**
 * A minimal in-memory stand-in for ioredis implementing just the GET/SET(EX)/DEL
 * surface the cache uses, so the benchmark runs without a REDIS_URL.
 */
function createMemoryShim() {
  const store = new Map();
  return {
    simulated: true,
    async get(key) {
      const entry = store.get(key);
      if (!entry) return null;
      if (entry.expiresAt && entry.expiresAt < Date.now()) {
        store.delete(key);
        return null;
      }
      return entry.value;
    },
    async set(key, value, _mode, ttlSeconds) {
      store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
      return "OK";
    },
    async del(...keys) {
      let removed = 0;
      for (const key of keys) removed += store.delete(key) ? 1 : 0;
      return removed;
    },
    async quit() {},
  };
}

async function connectRedis() {
  const url = process.env.REDIS_URL;
  if (!url) return createMemoryShim();

  const client = new Redis(url, {
    maxRetriesPerRequest: 2,
    enableOfflineQueue: false,
    lazyConnect: true,
  });
  try {
    await client.connect();
    await client.ping();
    return client;
  } catch (error) {
    console.warn(
      `[bench] REDIS_URL set but unreachable (${error.message}); falling back to in-memory shim.`,
    );
    client.disconnect();
    return createMemoryShim();
  }
}

/** cacheSet() mirror: JSON-encode and store with an EX TTL. */
async function cacheSet(redis, key, value, ttlSeconds) {
  await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
}

/** cacheGet() mirror: fetch and JSON-decode, null on miss. */
async function cacheGet(redis, key) {
  const raw = await redis.get(key);
  return raw ? JSON.parse(raw) : null;
}

/** getOrSet() mirror: read-through with an origin producer on miss. */
async function getOrSet(redis, key, ttlSeconds, producer) {
  const cached = await cacheGet(redis, key);
  if (cached !== null) return cached;
  const value = await producer();
  await cacheSet(redis, key, value, ttlSeconds);
  return value;
}

function percentile(sortedMs, p) {
  if (sortedMs.length === 0) return 0;
  const index = Math.min(
    sortedMs.length - 1,
    Math.ceil((p / 100) * sortedMs.length) - 1,
  );
  return sortedMs[index];
}

function summarize(label, samplesMs) {
  const sorted = [...samplesMs].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, n) => acc + n, 0);
  return {
    label,
    count: sorted.length,
    avg: sum / sorted.length,
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    max: sorted[sorted.length - 1] ?? 0,
  };
}

function fmt(ms) {
  return `${ms.toFixed(2)}ms`.padStart(9);
}

function printRow(row) {
  console.log(
    `  ${row.label.padEnd(12)} n=${String(row.count).padStart(5)}  ` +
      `avg=${fmt(row.avg)}  p50=${fmt(row.p50)}  p95=${fmt(row.p95)}  ` +
      `p99=${fmt(row.p99)}  max=${fmt(row.max)}`,
  );
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const redis = await connectRedis();
  const simulated = redis.simulated === true;

  // A representative payload roughly the size of a cached anime/home section.
  const payload = {
    generatedAt: new Date().toISOString(),
    items: Array.from(
      { length: Math.max(1, Math.round(opts.payload / 64)) },
      (_, i) => ({
        id: i,
        title: `Title ${i}`.padEnd(48, "-"),
      }),
    ),
  };

  const producer = async () => {
    // Simulate the origin (Consumet) round-trip a real MISS would pay.
    await sleep(opts.originLatency);
    return payload;
  };

  console.log(
    `\nRedis cache benchmark (PERF-04)` +
      `${simulated ? "  [SIMULATED — no reachable REDIS_URL]" : ""}`,
  );
  console.log(
    `  keys=${opts.keys}  origin-latency=${opts.originLatency}ms  ` +
      `ttl=${opts.ttl}s  payload≈${opts.payload}B\n`,
  );

  const keys = Array.from({ length: opts.keys }, (_, i) =>
    cacheKey("section", i),
  );

  // Clean any leftover benchmark keys from a previous run.
  await redis.del(...keys);

  // --- MISS pass: every key is cold, so getOrSet pays origin + SET. ---------
  const missMs = [];
  for (const key of keys) {
    const start = performance.now();
    await getOrSet(redis, key, opts.ttl, producer);
    missMs.push(performance.now() - start);
  }

  // --- HIT pass: every key is now warm, so getOrSet is a single GET. --------
  // The producer is wired to throw so an accidental miss fails loudly.
  const hitMs = [];
  const guard = async () => {
    throw new Error("unexpected cache miss during HIT pass");
  };
  for (const key of keys) {
    const start = performance.now();
    await getOrSet(redis, key, opts.ttl, guard);
    hitMs.push(performance.now() - start);
  }

  const miss = summarize("MISS", missMs);
  const hit = summarize("HIT", hitMs);

  console.log("Latency distribution:");
  printRow(miss);
  printRow(hit);

  const speedup = hit.p50 > 0 ? miss.p50 / hit.p50 : Infinity;
  const originSaved = miss.avg - hit.avg;
  console.log("\nStrategy effectiveness:");
  console.log(
    `  p50 speedup (miss→hit):   ${speedup.toFixed(1)}x faster on a warm cache`,
  );
  console.log(
    `  avg origin time saved:    ${originSaved.toFixed(2)}ms per cached request`,
  );
  console.log(
    `  cache overhead on hit:    ${hit.avg.toFixed(2)}ms avg (GET + JSON.parse)\n`,
  );

  if (simulated) {
    console.log(
      "NOTE: numbers are from the in-memory shim, not real Redis. Set REDIS_URL\n" +
        "      to benchmark actual network round-trips.\n",
    );
  }

  // Leave the keyspace as we found it.
  await redis.del(...keys);
  await redis.quit();
}

main().catch((error) => {
  console.error("[bench] failed:", error);
  process.exit(1);
});
