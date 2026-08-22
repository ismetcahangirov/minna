import type { AnimeEpisode } from "@/lib/anime/types";

/**
 * Episode filtering shared by the episodes route (which filters on the server
 * and paginates the result) and the watch route's list (which filters the
 * episodes it already holds, in the browser).
 */

/** Case- and diacritic-insensitive form used on both sides of a comparison. */
function normalize(value: string): string {
  return value.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/**
 * True when an episode answers `query`. A query of digits matches the episode
 * number — exactly, or as a prefix so "12" also finds 120..129 — and any query
 * matches a title that contains it. Numbers are always searchable; titles only
 * where the metadata sources know one.
 */
export function matchesEpisodeQuery(
  episode: Pick<AnimeEpisode, "number" | "title">,
  query: string,
): boolean {
  const needle = normalize(query);
  if (!needle) return true;

  const number = String(episode.number);
  if (
    /^\d+$/.test(needle) &&
    (number === needle || number.startsWith(needle))
  ) {
    return true;
  }

  const title = episode.title ? normalize(episode.title) : "";
  return title.length > 0 && title.includes(needle);
}

/** The episodes answering `query`, in the order they were given. */
export function filterEpisodes(
  episodes: AnimeEpisode[],
  query: string | null,
): AnimeEpisode[] {
  if (!query) return episodes;
  return episodes.filter((episode) => matchesEpisodeQuery(episode, query));
}
