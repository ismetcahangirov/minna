import { EpisodeList } from "@/components/anime/episode-list";
import {
  getSeriesEpisodeTitles,
  withEpisodeTitles,
} from "@/lib/anime/episode-titles";
import type { AnimeEpisode } from "@/lib/anime/types";

interface WatchEpisodeListProps {
  animeId: string;
  /** The canonical `{id}-{slug}` segment the episode links use. */
  animeSlug: string;
  episodes: AnimeEpisode[];
  /** Episode currently playing, marked in the list. */
  activeEpisodeNumber: number;
}

/**
 * The watch route's episode list, with every title the metadata sources know.
 *
 * Split out so the route can stream it: resolving a whole series' titles can
 * take seconds the first time (AniList, then a bounded Kitsu walk), and the
 * player must not wait behind a list that sits below it. Rendered inside a
 * `Suspense` whose fallback is the same list with plain numbered labels, so the
 * episodes are there immediately and gain their titles when the lookup lands.
 */
export async function WatchEpisodeList({
  animeId,
  animeSlug,
  episodes,
  activeEpisodeNumber,
}: WatchEpisodeListProps) {
  const titles = await getSeriesEpisodeTitles(animeId, episodes.length);

  return (
    <EpisodeList
      animeSlug={animeSlug}
      episodes={withEpisodeTitles(episodes, titles)}
      activeEpisodeNumber={activeEpisodeNumber}
    />
  );
}
