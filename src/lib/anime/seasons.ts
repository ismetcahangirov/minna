import "server-only";

import { cache } from "react";

import { CACHE_TTL, cacheGet, cacheKey, cacheSet } from "@/lib/cache";
import { fetchAnimeMeta } from "@/lib/consumet/anilist";

import {
  type AnimeDetail,
  type AnimeRelation,
  toAnimeDetail,
} from "@/lib/anime/types";

/**
 * Season switcher data (DETAIL-02).
 *
 * AniList has no per-title season field — it models seasons as separate anime
 * entries linked by `PREQUEL`/`SEQUEL` relations. `getAnimeSeasons` reconstructs
 * the ordered chain by walking those relations outward from the current title
 * (backward through prequels, forward through sequels), so the detail page can
 * render a "Season 1 / 2 / 3" switcher. Each season is its own `/anime/[id]`
 * page, so switching is plain navigation — the switcher only needs each
 * neighbour's title, format and episode count, which come from a lightweight
 * metadata fetch (no episode scrape).
 */

export type SeasonKind = "season" | "movie" | "ova" | "special";

export interface AnimeSeason {
  id: string;
  title: string;
  kind: SeasonKind;
  /** 1-based position within its own kind (Season 1, Movie 2, …). */
  index: number;
  episodeCount: number | null;
  /** True for the entry whose detail page is currently open. */
  isCurrent: boolean;
}

/** Cap the outward walk so a long or cyclic relation graph can't run away. */
const MAX_SEASON_HOPS = 12;

/** Media formats we treat as a watchable season (excludes MANGA/NOVEL/MUSIC). */
const ANIME_FORMATS = new Set([
  "TV",
  "TV_SHORT",
  "ONA",
  "OVA",
  "SPECIAL",
  "TV_SPECIAL",
  "MOVIE",
]);

interface SeasonNode {
  id: string;
  title: string;
  type: string | null;
  episodeCount: number | null;
}

function episodeCountOf(a: {
  currentEpisode: number | null;
  totalEpisodes: number | null;
}): number | null {
  const aired =
    typeof a.currentEpisode === "number" && a.currentEpisode > 0
      ? a.currentEpisode
      : null;
  const total =
    typeof a.totalEpisodes === "number" && a.totalEpisodes > 0
      ? a.totalEpisodes
      : null;
  return aired ?? total;
}

function toNode(detail: AnimeDetail): SeasonNode {
  return {
    id: detail.id,
    title: detail.title,
    type: detail.type,
    episodeCount: episodeCountOf(detail),
  };
}

function isAnimeFormat(type: string | null): boolean {
  return type === null || ANIME_FORMATS.has(type.toUpperCase());
}

/** The first unvisited relation of the given kind that is a watchable anime. */
function pickRelation(
  relations: AnimeRelation[],
  relationType: "PREQUEL" | "SEQUEL",
  visited: Set<string>,
): AnimeRelation | null {
  return (
    relations.find(
      (r) =>
        r.relationType?.toUpperCase() === relationType &&
        isAnimeFormat(r.type) &&
        !visited.has(r.id),
    ) ?? null
  );
}

/**
 * Fetches a neighbour's metadata, preferring an already-warm full detail, then
 * a cached lightweight meta, then a fresh metadata-only fetch. Never scrapes
 * episodes — traversal only needs titles/formats/relations.
 */
async function fetchNode(id: string): Promise<AnimeDetail | null> {
  const warm = await cacheGet<AnimeDetail>(cacheKey("anime", "detail", id));
  if (warm) return warm;

  const metaKey = cacheKey("anime", "seasons-meta", id);
  const cached = await cacheGet<AnimeDetail>(metaKey);
  if (cached) return cached;

  const node = toAnimeDetail(await fetchAnimeMeta(id));
  if (node) await cacheSet(metaKey, node, CACHE_TTL.long);
  return node;
}

/**
 * Walks one direction (prequels or sequels) from `start`, accumulating nodes.
 * Shares the `visited` set with the other direction so the two concurrent walks
 * never revisit the same entry, and honours the global hop budget.
 */
async function walk(
  start: AnimeDetail,
  relationType: "PREQUEL" | "SEQUEL",
  visited: Set<string>,
  budget: { hops: number },
): Promise<SeasonNode[]> {
  const nodes: SeasonNode[] = [];
  let relations = start.relations;

  while (budget.hops > 0) {
    const next = pickRelation(relations, relationType, visited);
    if (!next) break;
    visited.add(next.id);
    budget.hops -= 1;

    const node = await fetchNode(next.id);
    if (!node) break;
    nodes.push(toNode(node));
    relations = node.relations;
  }

  return nodes;
}

/** Assigns a display kind + per-kind 1-based index to each ordered node. */
function label(nodes: SeasonNode[], currentId: string): AnimeSeason[] {
  const counters: Record<SeasonKind, number> = {
    season: 0,
    movie: 0,
    ova: 0,
    special: 0,
  };

  return nodes.map((node) => {
    const format = node.type?.toUpperCase() ?? "";
    const kind: SeasonKind =
      format === "MOVIE"
        ? "movie"
        : format === "OVA"
          ? "ova"
          : format === "SPECIAL" || format === "TV_SPECIAL"
            ? "special"
            : "season";
    counters[kind] += 1;
    return {
      id: node.id,
      title: node.title,
      kind,
      index: counters[kind],
      episodeCount: node.episodeCount,
      isCurrent: node.id === currentId,
    };
  });
}

async function buildSeasons(detail: AnimeDetail): Promise<AnimeSeason[]> {
  const visited = new Set<string>([detail.id]);
  const budget = { hops: MAX_SEASON_HOPS };

  // Prequels and sequels are independent chains — walk them concurrently. They
  // share `visited`/`budget`, so a diamond-shaped graph still can't loop.
  const [back, forward] = await Promise.all([
    walk(detail, "PREQUEL", visited, budget),
    walk(detail, "SEQUEL", visited, budget),
  ]);

  const ordered = [...back.reverse(), toNode(detail), ...forward];
  return label(ordered, detail.id);
}

/**
 * Returns the ordered season list for an anime, or an empty list when it stands
 * alone / cannot be resolved. Long-TTL Redis + React `cache()`; seasons are a
 * pure enhancement, so any failure degrades to "no switcher" rather than
 * breaking the detail page.
 */
export const getAnimeSeasons = cache(
  async (detail: AnimeDetail): Promise<AnimeSeason[]> => {
    const key = cacheKey("anime", "seasons", detail.id);
    const cached = await cacheGet<AnimeSeason[]>(key);
    if (cached) return cached;

    try {
      const seasons = await buildSeasons(detail);
      // Only a real multi-entry chain is worth caching/showing; a lone season
      // is cheap to recompute and may fill in as neighbour metadata warms up.
      if (seasons.length > 1) await cacheSet(key, seasons, CACHE_TTL.long);
      return seasons;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[anime] seasons for "${detail.id}" unavailable:`, message);
      return [];
    }
  },
);
