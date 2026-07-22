/**
 * Anime catalog types shared by the home page sections (EPIC-04).
 *
 * Data originates from the Consumet API's AniList meta provider. Consumet's
 * response shape is loose (fields are frequently null or, across providers,
 * differently typed), so the raw types below are intentionally permissive and
 * every field is narrowed through {@link toAnimeSummary} into the strict
 * {@link AnimeSummary} the UI consumes — see the consumet-data-fetching skill.
 */

/** The four home-page listings (HOME-02..HOME-05). */
export const ANIME_SECTIONS = [
  "trending",
  "popular",
  "top-rated",
  "recent",
] as const;

export type AnimeSection = (typeof ANIME_SECTIONS)[number];

export function isAnimeSection(
  value: string | undefined,
): value is AnimeSection {
  return value !== undefined && ANIME_SECTIONS.includes(value as AnimeSection);
}

/** Normalized anime shown on a card or the hero. All optionals are nullable. */
export interface AnimeSummary {
  /** Consumet/AniList id, always a string (used in the `/anime/[id]` route). */
  id: string;
  title: string;
  /** Portrait cover art. */
  image: string | null;
  /** Landscape banner (preferred for the 16:9 card / hero). */
  banner: string | null;
  description: string | null;
  genres: string[];
  /** AniList average score, 0–100 (not yet divided). */
  rating: number | null;
  type: string | null;
  status: string | null;
  releaseYear: number | null;
  totalEpisodes: number | null;
  currentEpisode: number | null;
  /** Dominant color hex from AniList, used as an image placeholder tint. */
  color: string | null;
  /** Present only on the "recent episodes" listing. */
  episodeNumber: number | null;
}

// --- Raw Consumet AniList meta shapes (permissive on purpose) --------------

export interface ConsumetTitle {
  romaji?: string | null;
  english?: string | null;
  native?: string | null;
  userPreferred?: string | null;
}

export interface ConsumetAnimeResult {
  id?: string | number | null;
  title?: ConsumetTitle | string | null;
  image?: string | null;
  cover?: string | null;
  description?: string | null;
  genres?: string[] | null;
  rating?: number | null;
  type?: string | null;
  status?: string | null;
  releaseDate?: number | string | null;
  totalEpisodes?: number | null;
  currentEpisode?: number | null;
  color?: string | null;
  episodeNumber?: number | null;
}

export interface ConsumetListResponse {
  currentPage?: number;
  hasNextPage?: boolean;
  results?: ConsumetAnimeResult[] | null;
}

function pickTitle(title: ConsumetAnimeResult["title"]): string {
  if (typeof title === "string") return title.trim() || "Untitled";
  return (
    title?.english?.trim() ||
    title?.userPreferred?.trim() ||
    title?.romaji?.trim() ||
    title?.native?.trim() ||
    "Untitled"
  );
}

function toYear(
  releaseDate: ConsumetAnimeResult["releaseDate"],
): number | null {
  if (typeof releaseDate === "number") return releaseDate;
  if (typeof releaseDate === "string") {
    const year = Number.parseInt(releaseDate.slice(0, 4), 10);
    return Number.isFinite(year) ? year : null;
  }
  return null;
}

/**
 * Narrows a raw Consumet result into a strict {@link AnimeSummary}, or `null`
 * when the entry has no usable id (such entries are dropped by the caller).
 */
export function toAnimeSummary(
  raw: ConsumetAnimeResult | null | undefined,
): AnimeSummary | null {
  if (!raw || raw.id === undefined || raw.id === null) return null;

  const id = String(raw.id).trim();
  if (!id) return null;

  return {
    id,
    title: pickTitle(raw.title),
    image: raw.image?.trim() || null,
    banner: raw.cover?.trim() || null,
    description: raw.description?.trim() || null,
    genres: Array.isArray(raw.genres)
      ? raw.genres.filter(
          (g): g is string => typeof g === "string" && g.length > 0,
        )
      : [],
    rating: typeof raw.rating === "number" ? raw.rating : null,
    type: raw.type?.trim() || null,
    status: raw.status?.trim() || null,
    releaseYear: toYear(raw.releaseDate),
    totalEpisodes:
      typeof raw.totalEpisodes === "number" ? raw.totalEpisodes : null,
    currentEpisode:
      typeof raw.currentEpisode === "number" ? raw.currentEpisode : null,
    color: raw.color?.trim() || null,
    episodeNumber:
      typeof raw.episodeNumber === "number" ? raw.episodeNumber : null,
  };
}
