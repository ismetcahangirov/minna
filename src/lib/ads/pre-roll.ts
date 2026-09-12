/**
 * Client-safe pre-roll ad DTO (PLAYER-03). Only the fields the player needs are
 * exposed — internal columns like `active` never reach the browser.
 */
export interface PreRollAd {
  id: string;
  videoUrl: string;
  targetUrl: string | null;
  /** Admin-configured cap before auto-advancing; `null` plays to the end. */
  durationSeconds: number | null;
  /** Seconds before the "Skip ad" button unlocks (admin-configured). */
  skipAfterSeconds: number;
}

/**
 * The active ads a viewer may be shown, each with the weight an admin gave it.
 *
 * The weight travels to the browser because the pick is made there: the watch
 * page is cached at the edge (PERF-05), so an ad chosen while rendering would
 * be the same ad for everyone who loaded the page inside the revalidate window.
 * There is nothing to protect here — these are ads, and every field is about to
 * be rendered anyway.
 */
export type PreRollAdPool = Array<PreRollAd & { weight: number }>;

/**
 * Picks one ad, weighted-random, so admins can bias exposure via each ad's
 * `weight`. `null` for an empty pool — the player then goes straight to the
 * episode rather than showing an empty overlay.
 *
 * Pure and dependency-free so it can run wherever the pool ends up: the player
 * calls it once per view, `getActivePreRollAd` calls it on the server.
 */
export function pickPreRollAd(pool: PreRollAdPool): PreRollAd | null {
  if (pool.length === 0) return null;

  const totalWeight = pool.reduce((sum, ad) => sum + Math.max(1, ad.weight), 0);
  let ticket = Math.random() * totalWeight;

  const chosen =
    pool.find((ad) => {
      ticket -= Math.max(1, ad.weight);
      return ticket <= 0;
    }) ?? pool[0];

  return {
    id: chosen.id,
    videoUrl: chosen.videoUrl,
    targetUrl: chosen.targetUrl,
    durationSeconds: chosen.durationSeconds,
    skipAfterSeconds: chosen.skipAfterSeconds,
  };
}
