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

/**
 * How many episodes an anime is treated as having: the aired-so-far figure for
 * a currently-airing title, otherwise the announced total, or `0` when neither
 * is known.
 *
 * This is the count `ensureEpisodes` (in `@/lib/anime/detail`) synthesizes the
 * episode list from, so the sitemap can derive the same page count as the
 * episodes route without fetching each detail record.
 */
export function playableEpisodeCount(
  anime: Pick<AnimeSummary, "totalEpisodes" | "currentEpisode">,
): number {
  const { totalEpisodes, currentEpisode } = anime;
  const aired =
    typeof currentEpisode === "number" && currentEpisode > 0
      ? currentEpisode
      : null;
  const total =
    typeof totalEpisodes === "number" && totalEpisodes > 0
      ? totalEpisodes
      : null;
  return aired ?? total ?? 0;
}
