import "server-only";

import { ANIME, META } from "@consumet/extensions";

import type {
  ConsumetInfoResponse,
  ConsumetListResponse,
  ConsumetWatchResponse,
} from "@/lib/anime/types";

/**
 * In-process Consumet gateway.
 *
 * The public Consumet API (`api.consumet.org`) is gone, so instead of talking to
 * a hosted instance over HTTP we embed `@consumet/extensions` directly and run
 * its AniList meta provider in our own server runtime. Metadata (trending,
 * popular, search, detail fields) comes from AniList's GraphQL API and is rock
 * solid; only episode lists and playable sources depend on the scraping
 * sub-provider, which is selectable via `ANIME_PROVIDER`.
 *
 * The AniList provider's built-in default sub-provider is HiAnime, whose source
 * site shut down in 2026 — so we always pass an explicit, live sub-provider.
 */

/** Streaming sub-providers bundled with @consumet/extensions 1.8.8. */
const PROVIDER_FACTORIES = {
  animekai: () => new ANIME.AnimeKai(),
  animepahe: () => new ANIME.AnimePahe(),
  hianime: () => new ANIME.Hianime(),
  kickassanime: () => new ANIME.KickAssAnime(),
  animesama: () => new ANIME.AnimeSama(),
  animesaturn: () => new ANIME.AnimeSaturn(),
  animeunity: () => new ANIME.AnimeUnity(),
} as const;

type ProviderKey = keyof typeof PROVIDER_FACTORIES;

/**
 * Default streaming source. AnimeKai carries a large, actively-updated English
 * catalogue. If it goes down (these scraping sources are inherently volatile),
 * switch by setting `ANIME_PROVIDER` — e.g. `animepahe` — with no code change.
 */
const DEFAULT_PROVIDER: ProviderKey = "animekai";

function resolveProviderKey(): ProviderKey {
  const raw = process.env.ANIME_PROVIDER?.trim().toLowerCase();
  if (raw && raw in PROVIDER_FACTORIES) return raw as ProviderKey;
  return DEFAULT_PROVIDER;
}

/** The streaming sub-provider currently in effect (for logs / diagnostics). */
export const ANIME_PROVIDER: ProviderKey = resolveProviderKey();

// Reuse one AniList instance across warm serverless invocations — the provider
// holds internal HTTP state, so re-creating it per request is wasteful.
const globalForAnilist = globalThis as unknown as {
  anilist?: InstanceType<typeof META.Anilist>;
};

function getAnilist(): InstanceType<typeof META.Anilist> {
  if (!globalForAnilist.anilist) {
    globalForAnilist.anilist = new META.Anilist(
      PROVIDER_FACTORIES[ANIME_PROVIDER](),
    );
  }
  return globalForAnilist.anilist;
}

/**
 * The library's typed results are structurally compatible supersets of our
 * permissive `Consumet*` shapes, which the `to*` narrowers parse null-safely.
 * We cast at this single boundary so the rest of the anime layer is unchanged.
 */

export function fetchTrending(
  page: number,
  perPage: number,
): Promise<ConsumetListResponse> {
  return getAnilist().fetchTrendingAnime(
    page,
    perPage,
  ) as unknown as Promise<ConsumetListResponse>;
}

export function fetchPopular(
  page: number,
  perPage: number,
): Promise<ConsumetListResponse> {
  return getAnilist().fetchPopularAnime(
    page,
    perPage,
  ) as unknown as Promise<ConsumetListResponse>;
}

export function fetchRecent(
  page: number,
  perPage: number,
): Promise<ConsumetListResponse> {
  // The library's recent-episodes endpoint only worked with gogoanime/HiAnime,
  // both now gone — it 404s on the current providers. So "recently added" is
  // resolved from AniList directly: currently-releasing titles, newest first.
  // Pure metadata, so it stays reliable regardless of the streaming source.
  return getAnilist().advancedSearch(
    undefined, // query
    "ANIME", // type
    page,
    perPage,
    undefined, // format
    ["START_DATE_DESC"], // sort — newest premieres first
    undefined, // genres
    undefined, // id
    undefined, // year
    "RELEASING", // status
  ) as unknown as Promise<ConsumetListResponse>;
}

export interface AdvancedSearchOptions {
  query?: string;
  genres?: string[];
  /** AniList sort tokens, e.g. `["POPULARITY_DESC"]`, `["SCORE_DESC"]`. */
  sort?: string[];
  page: number;
  perPage: number;
}

export function advancedSearchAnime(
  opts: AdvancedSearchOptions,
): Promise<ConsumetListResponse> {
  const genres =
    opts.genres && opts.genres.length > 0 ? opts.genres : undefined;
  return getAnilist().advancedSearch(
    opts.query || undefined,
    undefined, // type
    opts.page,
    opts.perPage,
    undefined, // format
    opts.sort,
    genres,
  ) as unknown as Promise<ConsumetListResponse>;
}

export function fetchAnimeInfo(id: string): Promise<ConsumetInfoResponse> {
  return getAnilist().fetchAnimeInfo(
    id,
  ) as unknown as Promise<ConsumetInfoResponse>;
}

export function fetchEpisodeSources(
  episodeId: string,
): Promise<ConsumetWatchResponse> {
  return getAnilist().fetchEpisodeSources(
    episodeId,
  ) as unknown as Promise<ConsumetWatchResponse>;
}
