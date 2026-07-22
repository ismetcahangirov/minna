import "server-only";

import { eq } from "drizzle-orm";

import { ads } from "@/db/schema";
import { CACHE_TTL, cacheGet, cacheKey, cacheSet } from "@/lib/cache";

/**
 * Client-safe pre-roll ad DTO (PLAYER-03). Only the fields the player needs are
 * exposed — internal columns like `weight`/`active` never reach the browser.
 */
export interface PreRollAd {
  id: string;
  videoUrl: string;
  targetUrl: string | null;
  /** Seconds before the "Skip ad" button unlocks (admin-configured). */
  skipAfterSeconds: number;
}

type AdPoolRow = Pick<
  PreRollAd,
  "id" | "videoUrl" | "targetUrl" | "skipAfterSeconds"
> & { weight: number };

const AD_POOL_KEY = cacheKey("ads", "preroll", "active");

/**
 * Loads the active pre-roll ad pool. The pool (not the per-request pick) is
 * Redis-cached on a short TTL so admin edits (EPIC-12) surface quickly while a
 * burst of viewers doesn't hammer the DB. `@/db` is imported dynamically so its
 * `DATABASE_URL` requirement stays out of the build-time module graph.
 */
async function getActiveAdPool(): Promise<AdPoolRow[]> {
  const cached = await cacheGet<AdPoolRow[]>(AD_POOL_KEY);
  if (cached) return cached;

  try {
    const { db } = await import("@/db");
    const rows = await db
      .select({
        id: ads.id,
        videoUrl: ads.videoUrl,
        targetUrl: ads.targetUrl,
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
 * `null` when none are configured — in which case the player skips straight to
 * the episode rather than showing an empty overlay.
 *
 * Selection is weighted-random across the active pool so admins can bias
 * exposure via each ad's `weight`.
 */
export async function getActivePreRollAd(): Promise<PreRollAd | null> {
  const pool = await getActiveAdPool();
  if (pool.length === 0) return null;

  const totalWeight = pool.reduce((sum, ad) => sum + Math.max(1, ad.weight), 0);
  let ticket = Math.random() * totalWeight;

  for (const ad of pool) {
    ticket -= Math.max(1, ad.weight);
    if (ticket <= 0) {
      return {
        id: ad.id,
        videoUrl: ad.videoUrl,
        targetUrl: ad.targetUrl,
        skipAfterSeconds: ad.skipAfterSeconds,
      };
    }
  }

  const fallback = pool[0];
  return {
    id: fallback.id,
    videoUrl: fallback.videoUrl,
    targetUrl: fallback.targetUrl,
    skipAfterSeconds: fallback.skipAfterSeconds,
  };
}
