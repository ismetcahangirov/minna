import { NextResponse } from "next/server";

/**
 * Readiness probe (DEPLOY-03): unlike `/api/health` (pure liveness), this
 * exercises the two production data stores — Neon and Redis — and reports each.
 *
 * Neon is **required**: if the database is unreachable the app cannot serve, so
 * a failure returns `503`. Redis is **optional by design** — the cache layer
 * no-ops when unavailable (see `src/lib/cache`), so a degraded/unconfigured
 * cache is reported for observability but does not fail readiness.
 *
 * Dependencies are imported dynamically inside the handler so the route never
 * throws at module load if an env var is missing — the failure surfaces as a
 * reported check instead.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function checkDatabase(): Promise<"ok" | "error"> {
  try {
    const { sql } = await import("drizzle-orm");
    const { db } = await import("@/db");
    await db.execute(sql`select 1`);
    return "ok";
  } catch (error) {
    console.error("[ready] database check failed:", (error as Error).message);
    return "error";
  }
}

export async function GET() {
  const { cachePing } = await import("@/lib/cache");
  const [database, redis] = await Promise.all([checkDatabase(), cachePing()]);

  const ready = database === "ok";

  return NextResponse.json(
    {
      status: ready ? "ready" : "not_ready",
      checks: { database, redis },
      timestamp: new Date().toISOString(),
    },
    {
      status: ready ? 200 : 503,
      headers: { "Cache-Control": "no-store, max-age=0" },
    },
  );
}
