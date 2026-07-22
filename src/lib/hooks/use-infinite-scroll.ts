"use client";

import { useCallback, useEffect, useRef } from "react";

interface UseInfiniteScrollOptions {
  /** Load the next page. Called once each time the sentinel scrolls into view. */
  onLoadMore: () => void;
  /** Whether another page exists — the observer detaches once this is false. */
  hasNextPage: boolean;
  /** True while a page request is in flight; suppresses repeat triggers. */
  isLoading: boolean;
  /** Prefetch margin so the next page loads before the sentinel is on screen. */
  rootMargin?: string;
}

/**
 * Shared `IntersectionObserver`-based infinite scroll hook (LIST-01), used by
 * the Popular, Blogs and Favorites listings.
 *
 * Returns a ref to attach to a sentinel element at the end of the list: when it
 * intersects the viewport (expanded by `rootMargin` so loading starts early),
 * `onLoadMore` fires once. Further triggers are gated on `hasNextPage` and
 * `isLoading` so a single scroll never enqueues duplicate pages, and the
 * observer is torn down when there is nothing left to load.
 *
 * The latest callback/flags are read through a ref so the observer is created
 * once per `hasNextPage` transition rather than on every render — the callback
 * identity does not need to be stable at the call site.
 */
export function useInfiniteScroll({
  onLoadMore,
  hasNextPage,
  isLoading,
  rootMargin = "400px",
}: UseInfiniteScrollOptions) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Keep the newest values reachable from the (stable) observer callback. The
  // ref is synced in an effect (never during render — a lint error here) so the
  // observer does not have to be re-created whenever `isLoading`/`onLoadMore`
  // change; only a `hasNextPage` transition tears it down.
  const stateRef = useRef({ onLoadMore, hasNextPage, isLoading });
  useEffect(() => {
    stateRef.current = { onLoadMore, hasNextPage, isLoading };
  });

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const { onLoadMore, hasNextPage, isLoading } = stateRef.current;
      if (entries[0]?.isIntersecting && hasNextPage && !isLoading) {
        onLoadMore();
      }
    },
    [],
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage) return;

    const observer = new IntersectionObserver(handleIntersect, { rootMargin });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleIntersect, hasNextPage, rootMargin]);

  return sentinelRef;
}
