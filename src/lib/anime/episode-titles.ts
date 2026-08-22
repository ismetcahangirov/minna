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
const TITLES_CACHE_VERSION = "v2";

/** Episodes Kitsu returns per request — its hard per-page maximum. */
const KITSU_EPISODES_PER_PAGE = 20;

/** What a metadata source knows about one episode beyond its number. */
export interface EpisodeMeta {
  title: string | null;
  /** Episode still, when a source has one. */
  image: string | null;
}

/** Episode number → metadata, for one window of an anime's episode list. */
export type EpisodeTitleMap = Record<number, EpisodeMeta>;

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

/** Kitsu metadata for episodes `from..to`, or an empty map if it cannot answer. */
async function kitsuTitles(
  animeId: string,
  from: number,
  to: number,
): Promise<Map<number, EpisodeMeta>> {
  const out = new Map<number, EpisodeMeta>();
  try {
    // Kitsu sorts by episode number, so the window starts one before `from`.
    const episodes = await kitsuEpisodes(animeId, from - 1, to - from + 1);
    for (const episode of episodes) {
      if (!episode.title && !episode.image) continue;
      out.set(episode.number, { title: episode.title, image: episode.image });
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

  const titles = new Map<number, EpisodeMeta>();

  const anilist = await fetchAniListEpisodeTitles(animeId);
  for (let number = from; number <= to; number++) {
    const meta = anilist.get(number);
    if (meta) titles.set(number, { title: meta.title, image: meta.image });
  }

  // Fill the gaps AniList left — a partially covered window is the common case.
  if (titles.size < to - from + 1) {
    const kitsu = await kitsuTitles(animeId, from, to);
    for (const [number, meta] of kitsu) {
      if (number >= from && number <= to && !titles.has(number)) {
        titles.set(number, meta);
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
 * Returns `episodes` with each entry's title and still filled in from `titles`
 * where it has none of its own. Values the provider already supplied always
 * win; an episode no source knows keeps its numbered label and falls back to
 * the anime artwork.
 */
export function withEpisodeTitles(
  episodes: AnimeEpisode[],
  titles: EpisodeTitleMap,
): AnimeEpisode[] {
  return episodes.map((episode) => {
    const meta = titles[episode.number];
    if (!meta || (episode.title && episode.image)) return episode;
    return {
      ...episode,
      title: episode.title ?? meta.title ?? null,
      image: episode.image ?? meta.image ?? null,
    };
  });
}

/**
 * How far the Kitsu top-up walks when AniList's coverage is thin. Kitsu pages
 * at 20, so this bounds a whole-series lookup to 15 requests (300 episodes) —
 * a deliberate, logged bound rather than 50+ round-trips for a 1000-episode
 * series. Episodes past it stay searchable by number.
 */
const SERIES_KITSU_PAGES = 15;

/** Kitsu windows fetched at once during the top-up. */
const SERIES_KITSU_CONCURRENCY = 5;

/** Below this share of titled episodes AniList alone is not worth searching. */
const SERIES_COVERAGE_TARGET = 0.5;

/**
 * Titles for a whole series, keyed by episode number — the map the episode
 * search filters on and the watch route's list labels itself from.
 *
 * AniList answers in one call and usually covers the popular titles; when it
 * covers less than half the series, Kitsu is walked as far as
 * {@link SERIES_KITSU_PAGES} allows to fill the rest. The result is cached, so
 * that walk happens once a day per anime, and never during plain page browsing
 * (which only needs {@link getEpisodeTitles}'s single window).
 */
export async function getSeriesEpisodeTitles(
  animeId: string,
  totalEpisodes: number,
): Promise<EpisodeTitleMap> {
  if (!animeId || totalEpisodes <= 0) return {};

  const key = cacheKey(
    "anime",
    "episode-titles",
    TITLES_CACHE_VERSION,
    animeId,
    `series-${totalEpisodes}`,
  );
  const cached = await cacheGet<EpisodeTitleMap>(key);
  if (cached) return cached;

  const titles = new Map<number, EpisodeMeta>();
  for (const [number, meta] of await fetchAniListEpisodeTitles(animeId)) {
    if (number >= 1 && number <= totalEpisodes) {
      titles.set(number, { title: meta.title, image: meta.image });
    }
  }

  const titled = [...titles.values()].filter((meta) => meta.title).length;
  if (titled < totalEpisodes * SERIES_COVERAGE_TARGET) {
    const pages = Math.min(
      Math.ceil(totalEpisodes / KITSU_EPISODES_PER_PAGE),
      SERIES_KITSU_PAGES,
    );
    if (pages * KITSU_EPISODES_PER_PAGE < totalEpisodes) {
      console.warn(
        `[anime] episode-title search for ${animeId} covers the first ` +
          `${pages * KITSU_EPISODES_PER_PAGE} of ${totalEpisodes} episodes`,
      );
    }

    for (let first = 0; first < pages; first += SERIES_KITSU_CONCURRENCY) {
      const batch = Array.from(
        { length: Math.min(SERIES_KITSU_CONCURRENCY, pages - first) },
        (_, index) => {
          const from = (first + index) * KITSU_EPISODES_PER_PAGE + 1;
          return kitsuTitles(animeId, from, from + KITSU_EPISODES_PER_PAGE - 1);
        },
      );
      for (const window of await Promise.all(batch)) {
        for (const [number, meta] of window) {
          if (number >= 1 && number <= totalEpisodes && !titles.has(number)) {
            titles.set(number, meta);
          }
        }
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
