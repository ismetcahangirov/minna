import type { AnimeSummary } from "@/lib/anime/types";

/**
 * True when an anime has at least one playable episode.
 *
 * On Vercel the streaming scraper is IP-blocked, so the detail page synthesizes
 * episodes `1..N` from `currentEpisode ?? totalEpisodes` (see `ensureEpisodes`
 * in `@/lib/anime/detail`). An anime therefore has a real episode list exactly
 * when one of those counts is a positive number — otherwise the detail page
 * shows its "no episodes" state. Listing pages use this predicate to drop such
 * titles so a card never leads to an empty detail page.
 */
export function hasPlayableEpisodes(
  anime: Pick<AnimeSummary, "totalEpisodes" | "currentEpisode">,
): boolean {
  const { totalEpisodes, currentEpisode } = anime;
  return (
    (typeof totalEpisodes === "number" && totalEpisodes > 0) ||
    (typeof currentEpisode === "number" && currentEpisode > 0)
  );
}
