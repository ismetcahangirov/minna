/**
 * Anime genre taxonomy used by the header Categories dropdown (HEADER-02).
 *
 * Consumet's AniList provider browses by a fixed genre set (there is no
 * "list all genres" endpoint), so the taxonomy is effectively static and is
 * treated as near-static, long-TTL cached data — see `getCategories`.
 */

export interface Category {
  /** Human-readable genre name as AniList/Consumet expect it (e.g. "Slice of Life"). */
  name: string;
  /** URL-safe slug used for the category browse route (e.g. "slice-of-life"). */
  slug: string;
}

/** Canonical AniList genre names (the set Consumet's AniList provider accepts). */
export const ANIME_GENRES = [
  "Action",
  "Adventure",
  "Comedy",
  "Drama",
  "Ecchi",
  "Fantasy",
  "Horror",
  "Mahou Shoujo",
  "Mecha",
  "Music",
  "Mystery",
  "Psychological",
  "Romance",
  "Sci-Fi",
  "Slice of Life",
  "Sports",
  "Supernatural",
  "Thriller",
] as const;

/** Turns a genre name into a URL-safe slug: "Slice of Life" → "slice-of-life". */
export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Builds the `Category[]` list from raw genre names, skipping empty entries. */
export function toCategories(names: readonly string[]): Category[] {
  return names
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => ({ name, slug: toSlug(name) }));
}
