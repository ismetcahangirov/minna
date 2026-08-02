import "server-only";

import {
  type AdvancedSearchOptions,
  advancedSearchAnime as anilistAdvancedSearch,
  fetchAnimeInfo as anilistAnimeInfo,
  fetchPopular as anilistPopular,
  fetchRecent as anilistRecent,
  fetchTrending as anilistTrending,
} from "@/lib/consumet/anilist";
import {
  kitsuAdvancedSearch,
  kitsuAnimeInfo,
  kitsuPopular,
  kitsuRecent,
  kitsuSeasonNode,
  kitsuTrending,
} from "@/lib/kitsu/client";

import { fetchAniListSeasonNode } from "@/lib/anime/anilist-graphql";
import type {
  ConsumetInfoResponse,
  ConsumetListResponse,
} from "@/lib/anime/types";

/**
 * Catalog provider facade: AniList first, Kitsu as the standby.
 *
 * Every listing in the app used to call `@/lib/consumet/anilist` directly, which
 * made AniList a single point of failure — and AniList's public API disables
 * itself for days at a time (as of 2026-08 every request 403s with "temporarily
 * disabled"), blanking the whole catalog. These wrappers keep the exact
 * signatures the anime layer already used, so `catalog`, `browse`, `search` and
 * `detail` only had to change their import: each call tries AniList and falls
 * back to the equivalent Kitsu query (`@/lib/kitsu/client`) when AniList fails
 * or returns nothing.
 *
 * Both sources are keyed by AniList ids, so a switch is invisible downstream —
 * cached records, `/anime/[id]` links, favorites and the MegaPlay embed all
 * keep resolving.
 */

/**
 * How long AniList is skipped after a failure.
 *
 * When AniList is down every call costs a full round-trip before falling back,
 * on every uncached request. Remembering the last failure keeps an outage from
 * doubling the latency of the whole catalog, while still re-probing often enough
 * to pick recovery up quickly. Held on `globalThis` so it survives across warm
 * serverless invocations.
 */
const ANILIST_COOLDOWN_MS = 60_000;

const globalForProvider = globalThis as unknown as {
  anilistFailedAt?: number;
};

function anilistInCooldown(): boolean {
  const failedAt = globalForProvider.anilistFailedAt;
  return failedAt !== undefined && Date.now() - failedAt < ANILIST_COOLDOWN_MS;
}

function noteAnilistFailure(): void {
  globalForProvider.anilistFailedAt = Date.now();
}

function noteAnilistSuccess(): void {
  globalForProvider.anilistFailedAt = undefined;
}

function describe(error: unknown): string {
  if (error instanceof Error) return error.message;
  return (error as { message?: string })?.message ?? String(error);
}

/**
 * Runs `primary` (AniList) and falls back to `standby` (Kitsu) when it throws or
 * yields nothing usable. `isEmpty` decides what "nothing usable" means for the
 * payload at hand; `label` only identifies the call in logs.
 */
async function withFallback<T>(
  label: string,
  primary: () => Promise<T>,
  standby: () => Promise<T>,
  isEmpty: (value: T) => boolean,
): Promise<T> {
  if (!anilistInCooldown()) {
    try {
      const result = await primary();
      if (!isEmpty(result)) {
        noteAnilistSuccess();
        return result;
      }
      console.warn(
        `[anime] anilist returned nothing for ${label}; using kitsu`,
      );
    } catch (error) {
      noteAnilistFailure();
      console.warn(
        `[anime] anilist unavailable for ${label} (${describe(error)}); using kitsu`,
      );
    }
  }

  return standby();
}

function listIsEmpty(response: ConsumetListResponse): boolean {
  return !Array.isArray(response?.results) || response.results.length === 0;
}

export function fetchTrending(
  page: number,
  perPage: number,
): Promise<ConsumetListResponse> {
  return withFallback(
    "trending",
    () => anilistTrending(page, perPage),
    () => kitsuTrending(page, perPage),
    listIsEmpty,
  );
}

export function fetchPopular(
  page: number,
  perPage: number,
): Promise<ConsumetListResponse> {
  return withFallback(
    "popular",
    () => anilistPopular(page, perPage),
    () => kitsuPopular(page, perPage),
    listIsEmpty,
  );
}

export function fetchRecent(
  page: number,
  perPage: number,
): Promise<ConsumetListResponse> {
  return withFallback(
    "recent",
    () => anilistRecent(page, perPage),
    () => kitsuRecent(page, perPage),
    listIsEmpty,
  );
}

export function advancedSearchAnime(
  options: AdvancedSearchOptions,
): Promise<ConsumetListResponse> {
  return withFallback(
    `search(${options.query ?? "*"})`,
    () => anilistAdvancedSearch(options),
    () =>
      kitsuAdvancedSearch({
        query: options.query,
        genres: options.genres,
        sort: options.sort,
        page: options.page,
        perPage: options.perPage,
      }),
    listIsEmpty,
  );
}

/**
 * Full metadata for one anime by AniList id. Unlike the listings this can
 * legitimately resolve to `null` (unknown id), which the detail route turns into
 * a 404 — so the standby is consulted before that conclusion is drawn.
 */
export function fetchAnimeInfo(
  id: string,
): Promise<ConsumetInfoResponse | null> {
  return withFallback(
    `detail(${id})`,
    () => anilistAnimeInfo(id),
    () => kitsuAnimeInfo(id),
    (info) => info === null || info === undefined,
  );
}

/**
 * One node of the season chain by AniList id: the title's own metadata plus its
 * `PREQUEL`/`SEQUEL` relations, which `@/lib/anime/seasons` walks outward.
 *
 * The primary here is AniList's GraphQL API directly rather than the Consumet
 * provider — the season walk needs pure metadata, and Consumet's info call
 * couples it to a streaming-provider episode mapping that throws on Vercel.
 * Both sources emit AniList ids and the same relation vocabulary, so the walk
 * can cross between them mid-chain without noticing.
 */
export function fetchSeasonNode(
  id: string,
): Promise<ConsumetInfoResponse | null> {
  return withFallback(
    `season(${id})`,
    () => fetchAniListSeasonNode(id),
    () => kitsuSeasonNode(id),
    (node) => node === null || node === undefined,
  );
}

export type { AdvancedSearchOptions };
