/**
 * One page of an infinite-scroll listing (EPIC-08). The Popular, Blogs and
 * Favorites pages all page through their data with this shape so the shared
 * {@link import("@/components/browse/infinite-paged-grid").InfinitePagedGrid}
 * client component and the `useInfiniteScroll` hook can drive any of them.
 */
export interface PagedResult<T> {
  items: T[];
  /** 1-based page number this batch corresponds to. */
  page: number;
  /** Whether a further page exists (drives the infinite-scroll sentinel). */
  hasNextPage: boolean;
}

/** How many items each listing page requests. Kept uniform across the epic. */
export const BROWSE_PAGE_SIZE = 24;
