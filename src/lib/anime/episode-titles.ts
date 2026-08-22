import "server-only";

import { fetchAniListEpisodeTitles } from "@/lib/anime/anilist-graphql";
import type { AnimeEpisode } from "@/lib/anime/types";
import { CACHE_TTL, cacheGet, cacheKey, cacheSet } from "@/lib/cache";
import { kitsuEpisodes } from "@/lib/kitsu/client";

/**
 * Per-episode titles for the episode cards.
 *
 * The episode list itself is synthesized as plain numbers 1..N (see
 * `ensureEpisodes` in `@/lib/anime/detail`) because the streaming scrapers are
 * IP-blocked on Vercel, so every card used to read "Episode 12" and nothing
 * more. Titles are therefore enriched separately, from the two metadata sources
 * the app already talks to:
 *
 * 1. **AniList** — one GraphQL call returns the whole series' `streamingEpisodes`
 *    labels ("Episode 12 - Beyond the Wall"), so it is tried first.
 * 2. **Kitsu** — a structured episode list, but paged at 20, so only the window
 *    the current page renders is fetched. Consulted for the episodes AniList
 *    left untitled.
 *
 * Neither source is required: a title-less episode simply keeps the
 * "Episode {n}" label it has today. Nothing here throws.
 */

/** Bumped when the cached shape changes so stale entries are ignored. */
const TITLES_CACHE_VERSION = "v1";

/** Episode number → title, for one window of an anime's episode list. */
export type EpisodeTitleMap = Record<number, string>;

/** Redis key for one anime's cached title window. */
function titlesCacheKey(animeId: string, from: number, to: number): string {
  return cacheKey(
    "anime",
    "episode-titles",
    TITLES_CACHE_VERSION,
    animeId,
    `${from}-${to}`,
  );
}

/** Kitsu titles for episodes `from..to`, or an empty map if it cannot answer. */
async function kitsuTitles(
  animeId: string,
  from: number,
  to: number,
): Promise<Map<number, string>> {
  const out = new Map<number, string>();
  try {
    // Kitsu sorts by episode number, so the window starts one before `from`.
    const episodes = await kitsuEpisodes(animeId, from - 1, to - from + 1);
    for (const episode of episodes) {
      if (episode.title) out.set(episode.number, episode.title);
    }
  } catch (error) {
    console.warn(
      `[anime] kitsu episode titles for ${animeId} unavailable:`,
      (error as Error).message,
    );
  }
  return out;
}

/**
 * Titles for episodes `from..to` (inclusive, 1-based) of one anime, keyed by
 * episode number. Missing entries mean "no known title", not an error.
 *
 * Read-through Redis cache per window. An empty result is cached only briefly,
 * so a newly aired — and only later titled — episode picks its name up without
 * waiting out the long TTL.
 */
export async function getEpisodeTitles(
  animeId: string,
  from: number,
  to: number,
): Promise<EpisodeTitleMap> {
  if (!animeId || !Number.isFinite(from) || !Number.isFinite(to) || to < from) {
    return {};
  }

  const key = titlesCacheKey(animeId, from, to);
  const cached = await cacheGet<EpisodeTitleMap>(key);
  if (cached) return cached;

  const titles = new Map<number, string>();

  const anilist = await fetchAniListEpisodeTitles(animeId);
  for (let number = from; number <= to; number++) {
    const title = anilist.get(number);
    if (title) titles.set(number, title);
  }

  // Fill the gaps AniList left — a partially covered window is the common case.
  if (titles.size < to - from + 1) {
    const kitsu = await kitsuTitles(animeId, from, to);
    for (const [number, title] of kitsu) {
      if (number >= from && number <= to && !titles.has(number)) {
        titles.set(number, title);
      }
    }
  }

  const result = Object.fromEntries(titles) as EpisodeTitleMap;
  await cacheSet(
    key,
    result,
    titles.size > 0 ? CACHE_TTL.long : CACHE_TTL.short,
  );
  return result;
}

/**
 * Returns `episodes` with each entry's `title` filled in from `titles` when it
 * has none of its own. A real provider-supplied title always wins.
 */
export function withEpisodeTitles(
  episodes: AnimeEpisode[],
  titles: EpisodeTitleMap,
): AnimeEpisode[] {
  return episodes.map((episode) =>
    episode.title
      ? episode
      : { ...episode, title: titles[episode.number] ?? null },
  );
}
