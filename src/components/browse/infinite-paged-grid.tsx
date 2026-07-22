"use client";

import { Loader2, RotateCw } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

import { useInfiniteScroll } from "@/lib/hooks/use-infinite-scroll";
import type { PagedResult } from "@/lib/browse/types";

/** RTK-Query-shaped result the grid reads from the injected page hook. */
export interface PageQueryState<T> {
  data?: PagedResult<T>;
  isFetching: boolean;
  isError: boolean;
  refetch: () => void;
}

interface InfinitePagedGridProps<T> {
  /**
   * A React Query hook (passed by reference, e.g. `useGetPopularPageQuery`),
   * called once per render with the current page. Passing the hook itself keeps
   * pagination state inside this shared component while each page supplies its
   * own endpoint — and, being a bare `use…` reference, satisfies rules-of-hooks.
   */
  usePage: (page: number, options: { skip: boolean }) => PageQueryState<T>;
  /** First page rendered on the server (SSR/SEO); client continues from here. */
  initialPage: PagedResult<T>;
  renderItem: (item: T, index: number) => ReactNode;
  renderSkeleton: () => ReactNode;
  /** Stable identity used for de-duplication and React keys. */
  getKey: (item: T) => string;
  gridClassName: string;
  skeletonCount?: number;
  labels: {
    empty: string;
    emptyHint?: string;
    error: string;
    retry: string;
    endOfList: string;
  };
  /** Icon shown in the empty / error state. */
  statusIcon: ReactNode;
}

/**
 * Shared infinite-scroll grid (LIST-01) powering the Popular, Blogs and
 * Favorites pages. The server renders `initialPage` for SEO and a no-flash first
 * paint; on the client an `IntersectionObserver` sentinel loads each further
 * page through the injected `usePage` hook, accumulating de-duplicated results.
 *
 * Pagination is advanced with the render-phase "adjust state on prop change"
 * pattern (no `setState` in effects — an ESLint hard error in this repo).
 */
export function InfinitePagedGrid<T>({
  usePage,
  initialPage,
  renderItem,
  renderSkeleton,
  getKey,
  gridClassName,
  skeletonCount = 12,
  labels,
  statusIcon,
}: InfinitePagedGridProps<T>) {
  const seedPage = initialPage.page;
  const [page, setPage] = useState(seedPage);
  const [items, setItems] = useState<T[]>(initialPage.items);
  const [mergedPage, setMergedPage] = useState(seedPage);
  const [hasNextPage, setHasNextPage] = useState(initialPage.hasNextPage);

  // Skip the query while showing the server-seeded page; fetch only page N+1 on.
  const { data, isFetching, isError, refetch } = usePage(page, {
    skip: page === seedPage,
  });

  // Merge a freshly-arrived page (render-phase): append de-duplicated by key.
  if (data && data.page !== mergedPage) {
    setMergedPage(data.page);
    setHasNextPage(data.hasNextPage);
    setItems((prev) => {
      const seen = new Set(prev.map(getKey));
      return [...prev, ...data.items.filter((item) => !seen.has(getKey(item)))];
    });
  }

  const sentinelRef = useInfiniteScroll({
    onLoadMore: () => setPage((prev) => prev + 1),
    hasNextPage,
    isLoading: isFetching,
  });

  if (isError && items.length === 0) {
    return (
      <StatusBlock
        icon={statusIcon}
        title={labels.error}
        action={
          <button
            type="button"
            onClick={() => refetch()}
            className="border-border bg-surface hover:border-primary/60 hover:text-foreground text-muted-foreground inline-flex items-center gap-2 border px-4 py-2 text-sm font-medium transition-colors"
          >
            <RotateCw className="size-4" aria-hidden />
            {labels.retry}
          </button>
        }
      />
    );
  }

  if (items.length === 0 && !isFetching) {
    return (
      <StatusBlock
        icon={statusIcon}
        title={labels.empty}
        hint={labels.emptyHint}
      />
    );
  }

  return (
    <div>
      <div className={gridClassName}>
        {items.map((item, index) => (
          <div key={getKey(item)}>{renderItem(item, index)}</div>
        ))}
        {isFetching &&
          Array.from({ length: skeletonCount }).map((_, index) => (
            <div key={`skeleton-${index}`}>{renderSkeleton()}</div>
          ))}
      </div>

      {/* Sentinel: intersecting it loads the next page. */}
      {hasNextPage && <div ref={sentinelRef} aria-hidden className="h-px" />}

      {isFetching && (
        <p
          className="text-muted-foreground mt-8 flex items-center justify-center gap-2 text-sm"
          aria-live="polite"
        >
          <Loader2 className="size-4 animate-spin" aria-hidden />
        </p>
      )}

      {!hasNextPage && items.length > 0 && (
        <p className="text-muted-foreground mt-10 text-center text-sm">
          {labels.endOfList}
        </p>
      )}
    </div>
  );
}

interface StatusBlockProps {
  icon: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}

/** Centered empty / error placeholder shared by the listing states. */
function StatusBlock({ icon, title, hint, action }: StatusBlockProps) {
  return (
    <div className="text-muted-foreground flex flex-col items-center gap-3 py-16 text-center">
      <span className="text-muted-foreground/70">{icon}</span>
      <p className="text-foreground text-base font-medium">{title}</p>
      {hint && <p className="max-w-sm text-sm">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
