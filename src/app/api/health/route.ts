import { NextResponse } from "next/server";

/**
 * Liveness endpoint (DEPLOY-01): a dependency-free health check used by the
 * hosting platform to confirm the app is up and serving requests. Vercel does
 * not require a health path, but Render's blueprint points its `healthCheckPath`
 * here (see `render.yaml`, DEPLOY-02).
 *
 * Deliberately does NOT touch Neon or Redis: a liveness probe must stay green
 * while a downstream dependency is briefly unavailable, otherwise the platform
 * restarts a process that is actually healthy. Readiness of those services is
 * reported per-request by the routes that use them (both degrade gracefully).
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET() {
  return NextResponse.json(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
    },
    {
      headers: {
        // Never cache a health probe — every hit must reflect the live process.
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
