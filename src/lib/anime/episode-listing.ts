import { EPISODES_PAGE_SIZE } from "@/lib/anime/href";
import type { AnimeEpisode } from "@/lib/anime/types";

/**
 * The slicing rules behind an episode list, shared by the two places one is
 * rendered: the detail page's inline list under the season cards, and the
 * standalone `/anime/[id]/episodes` route. Keeping them here is what lets the
 * inline list behave exactly like the route's — same page size, same ordering,
 * same handling of an out-of-range page.
 */

/** True when the `?order=` param asks for the newest-first listing. */
export function isDescending(order: string | string[] | undefined): boolean {
  return order === "desc";
}

/**
 * The page actually rendered for a requested page number: the first page when
 * the request is invalid (`null`) or points past the end, so a junk `?page=`
 * shows content rather than an empty list.
 */
export function resolvePage(
  requested: number | null,
  totalPages: number,
): number {
  if (requested === null || requested < 1 || requested > totalPages) return 1;
  return requested;
}

/**
 * The episodes rendered on `page`, in display order, together with the range of
 * episode numbers they cover (used to fetch just that window's titles).
 */
export function pageSlice(
  episodes: AnimeEpisode[],
  page: number,
  descending: boolean,
): { slice: AnimeEpisode[]; from: number; to: number } {
  const ordered = [...episodes].sort((a, b) => a.number - b.number);
  if (descending) ordered.reverse();

  const start = (page - 1) * EPISODES_PAGE_SIZE;
  const slice = ordered.slice(start, start + EPISODES_PAGE_SIZE);
  const numbers = slice.map((episode) => episode.number);

  return {
    slice,
    from: numbers.length ? Math.min(...numbers) : 0,
    to: numbers.length ? Math.max(...numbers) : 0,
  };
}
