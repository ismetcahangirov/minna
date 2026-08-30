import { getTranslations } from "next-intl/server";

import { getEpisodeTitles } from "@/lib/anime/episode-titles";

interface WatchEpisodeLabelProps {
  animeId: string;
  episodeNumber: number;
  /** Title the provider already supplied, when it had one. */
  title: string | null;
}

/**
 * The line under the player: "Episode 5 · The Fall of Zhiganshina".
 *
 * The episode list the route holds is synthesized from plain numbers (the
 * streaming scrapers are IP-blocked, see `@/lib/anime/detail`), so the name has
 * to be looked up the same way the episode cards look theirs up — one window of
 * one episode, which is a Redis hit on all but the first view. Split out so the
 * route can stream it behind a `Suspense` whose fallback is the numbered label:
 * the player never waits on a metadata lookup that only adds a few words.
 */
export async function WatchEpisodeLabel({
  animeId,
  episodeNumber,
  title,
}: WatchEpisodeLabelProps) {
  const t = await getTranslations("player");
  const label = t("episodeLabel", { number: episodeNumber });

  const resolved =
    title ??
    (await getEpisodeTitles(animeId, episodeNumber, episodeNumber))[
      episodeNumber
    ]?.title ??
    null;

  return resolved ? `${label} · ${resolved}` : label;
}
