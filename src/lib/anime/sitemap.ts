import "server-only";

import { hasPlayableEpisodes } from "@/lib/anime/episodes";
import { type AnimeSummary, toAnimeSummary } from "@/lib/anime/types";
import { advancedSearchAnime } from "@/lib/anime/provider";

/** One anime entry for the sitemap: id + title (title builds the slug URL). */
export interface AnimeSitemapEntry {
  id: string;
  title: string;
}

/** One watch/episode entry for the sitemap. */
export interface EpisodeSitemapEntry {
  animeId: string;
  animeTitle: string;
  episodeNumber: number;
}

/**
 * How much of the popular feed to enumerate. AniList exposes no "list all"
 * endpoint, so the sitemap covers the popular head (this many pages) plus every
 * anime users have favorited or watched. Raise FEED_PAGES to widen coverage —
 * it is a deliberate, logged bound, not silent truncation.
 */
const FEED_PAGES = 30;
const FEED_PER_PAGE = 50;

/** Pages through the popular feed, collecting id→title for titles with episodes. */
async function listPopularForSitemap(): Promise<Map<string, string>> {
  const out = new Map<string, string>();

  for (let page = 1; page <= FEED_PAGES; page++) {
    let results: AnimeSummary[];
    try {
      const data = await advancedSearchAnime({
        sort: ["POPULARITY_DESC"],
        page,
        perPage: FEED_PER_PAGE,
      });
      results = (Array.isArray(data?.results) ? data.results : [])
        .map(toAnimeSummary)
        .filter((entry): entry is AnimeSummary => entry !== null)
        .filter(hasPlayableEpisodes);
      if (data?.hasNextPage === false) {
        for (const a of results) if (!out.has(a.id)) out.set(a.id, a.title);
        break;
      }
    } catch (error) {
      console.warn(
        `[sitemap] popular anime page ${page} failed:`,
        (error as Error).message,
      );
      break;
    }
    for (const a of results) if (!out.has(a.id)) out.set(a.id, a.title);
  }

  return out;
}

/** Distinct anime users have favorited or watched (both store a title). */
async function listSavedAnime(): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  try {
    const { db } = await import("@/db");
    const { favorites, watchProgress } = await import("@/db/schema");

    const favs = await db
      .selectDistinct({ id: favorites.animeId, title: favorites.title })
      .from(favorites)
      .limit(50_000);
    for (const r of favs) if (r.title && !out.has(r.id)) out.set(r.id, r.title);

    const watched = await db
      .selectDistinct({ id: watchProgress.animeId, title: watchProgress.title })
      .from(watchProgress)
      .limit(50_000);
    for (const r of watched) {
      if (r.title && !out.has(r.id)) out.set(r.id, r.title);
    }
  } catch (error) {
    console.error(
      "[sitemap] saved anime enumeration failed:",
      (error as Error).message,
    );
  }
  return out;
}

/**
 * Enumerates anime detail pages for the sitemap (PERF-01): the popular head
 * (episode-filtered, with titles for canonical slug URLs) unioned with every
 * favorited/watched title. Deduped by id, popular entries winning. Never
 * throws — a data-source outage yields a shorter list, not a broken sitemap.
 */
export async function listAnimeSitemapEntries(): Promise<AnimeSitemapEntry[]> {
  const [popular, saved] = await Promise.all([
    listPopularForSitemap(),
    listSavedAnime(),
  ]);

  const merged = new Map<string, string>(popular);
  for (const [id, title] of saved) if (!merged.has(id)) merged.set(id, title);

  return [...merged].map(([id, title]) => ({ id, title }));
}

/**
 * Enumerates episode watch pages for the sitemap: every distinct
 * (animeId, episodeNumber) pair recorded in watch_progress. Uses the
 * denormalized `title` column so no extra Consumet round-trip is needed.
 * Never throws — a DB outage yields an empty list, not a broken sitemap.
 */
export async function listEpisodeSitemapEntries(): Promise<
  EpisodeSitemapEntry[]
> {
  try {
    const { db } = await import("@/db");
    const { watchProgress } = await import("@/db/schema");

    const rows = await db
      .selectDistinct({
        animeId: watchProgress.animeId,
        animeTitle: watchProgress.title,
        episodeNumber: watchProgress.episodeNumber,
      })
      .from(watchProgress)
      .limit(200_000);

    return rows
      .filter(
        (
          r,
        ): r is {
          animeId: string;
          animeTitle: string | null;
          episodeNumber: number;
        } => r.episodeNumber !== null,
      )
      .map((r) => ({
        animeId: r.animeId,
        animeTitle: r.animeTitle ?? "",
        episodeNumber: r.episodeNumber,
      }));
  } catch (error) {
    console.error(
      "[sitemap] episode enumeration failed:",
      (error as Error).message,
    );
    return [];
  }
}
