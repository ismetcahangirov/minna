import "server-only";

import { eq } from "drizzle-orm";

import { ads } from "@/db/schema";
import {
  pickPreRollAd,
  type PreRollAd,
  type PreRollAdPool,
} from "@/lib/ads/pre-roll";
import {
  CACHE_TTL,
  cacheDelete,
  cacheGet,
  cacheKey,
  cacheSet,
} from "@/lib/cache";

export type { PreRollAd, PreRollAdPool } from "@/lib/ads/pre-roll";

const AD_POOL_KEY = cacheKey("ads", "preroll", "active");

/**
 * Drops the cached active-ad pool so admin edits (ADMIN-02) surface on the next
 * watch page load rather than waiting out the short TTL. Called from the admin
 * ad mutations.
 */
export async function invalidateAdPool(): Promise<void> {
  await cacheDelete(AD_POOL_KEY);
}

/**
 * Loads the active pre-roll ad pool. The pool (not the per-request pick) is
 * Redis-cached on a short TTL so admin edits (EPIC-12) surface quickly while a
 * burst of viewers doesn't hammer the DB. `@/db` is imported dynamically so its
 * `DATABASE_URL` requirement stays out of the build-time module graph.
 *
 * The whole pool is what the watch page renders now, and the player draws from
 * it in the browser: the page is cached at the edge (PERF-05), so a pick made
 * here would be baked into the HTML and every viewer inside the revalidate
 * window would see the same ad — which is not a weighted rotation at all.
 */
export async function getActiveAdPool(): Promise<PreRollAdPool> {
  const cached = await cacheGet<PreRollAdPool>(AD_POOL_KEY);
  if (cached) return cached;

  try {
    const { db } = await import("@/db");
    const rows = await db
      .select({
        id: ads.id,
        videoUrl: ads.videoUrl,
        targetUrl: ads.targetUrl,
        durationSeconds: ads.durationSeconds,
        skipAfterSeconds: ads.skipAfterSeconds,
        weight: ads.weight,
      })
      .from(ads)
      .where(eq(ads.active, true));

    await cacheSet(AD_POOL_KEY, rows, CACHE_TTL.short);
    return rows;
  } catch (error) {
    console.error("[ads] pool load failed:", (error as Error).message);
    return [];
  }
}

/**
 * Selects one active pre-roll ad to show before an episode (PLAYER-02/03), or
 * `null` when none are configured. Kept for callers that pick server-side; the
 * watch page hands the pool to the player instead (see {@link getActiveAdPool}).
 */
export async function getActivePreRollAd(): Promise<PreRollAd | null> {
  return pickPreRollAd(await getActiveAdPool());
}
