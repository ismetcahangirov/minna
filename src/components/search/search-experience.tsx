"use client";

import { Loader2, RotateCw, Search, SearchX, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import {
  SearchResultsGrid,
  SearchResultsSkeleton,
} from "@/components/search/search-results";
import { ANIME_GENRES } from "@/lib/anime/genres";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import type { AnimeSummary } from "@/lib/anime/types";
import { cn } from "@/lib/utils";
import { useSearchAnimeQuery } from "@/store/api/search-api";

interface SearchExperienceProps {
  /** Seed from `/search?q=…` so deep links render the right query (SSR). */
  initialQuery?: string;
}

/**
 * Interactive search page (SEARCH-01/02/04). A debounced text input and a genre
 * facet drive the RTK Query `searchAnime` endpoint (which proxies our cached
 * `/api/anime/search` route). Results accumulate across "load more" pages; the
 * idle, loading, empty and error states are all handled here. Sits above the
 * atmospheric background as a flat, sharp-cornered panel per the design system.
 */
export function SearchExperience({ initialQuery = "" }: SearchExperienceProps) {
  const t = useTranslations("search");

  const [input, setInput] = useState(initialQuery);
  const [genres, setGenres] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AnimeSummary[]>([]);

  const debounced = useDebouncedValue(input, 350);
  const q = debounced.trim();
  const genreKey = genres.join(",");
  const hasCriteria = q.length > 0 || genres.length > 0;
  const searchKey = `${q}|${genreKey}`;

  // "Adjust state when a value changes" (render-phase, no effect): whenever the
  // query or genre facet changes, reset pagination and the accumulated results.
  const [activeKey, setActiveKey] = useState(searchKey);
  const [mergedPage, setMergedPage] = useState(0);
  if (searchKey !== activeKey) {
    setActiveKey(searchKey);
    setPage(1);
    setItems([]);
    setMergedPage(0);
  }

  const { data, isFetching, isError, refetch } = useSearchAnimeQuery(
    { q, genres, page },
    { skip: !hasCriteria },
  );

  // Merge a freshly-arrived page into the accumulated list (render-phase):
  // page 1 replaces, later pages append de-duplicated by id. `data` always
  // matches the current query args, so guarding on its page number is safe.
  if (data && searchKey === activeKey && data.page !== mergedPage) {
    setMergedPage(data.page);
    setItems((prev) => {
      if (data.page <= 1) return data.results;
      const seen = new Set(prev.map((a) => a.id));
      return [...prev, ...data.results.filter((a) => !seen.has(a.id))];
    });
  }

  // Reflect the query in the URL for shareable links — no navigation/rerender.
  useEffect(() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `/search?${qs}` : "/search");
  }, [q]);

  const toggleGenre = (genre: string) => {
    setGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre],
    );
  };

  const isInitialLoading = isFetching && page === 1;
  const showEmpty =
    hasCriteria && !isFetching && items.length === 0 && !isError;
  const showError = isError && items.length === 0;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 sm:px-6 lg:px-8">
      <header className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          {t("heading")}
        </h1>
        <p className="text-muted-foreground max-w-xl text-sm sm:text-base">
          {t("subtitle")}
        </p>
      </header>

      {/* Search input (SEARCH-01) */}
      <div className="relative mx-auto w-full max-w-2xl">
        <Search
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2"
          aria-hidden
        />
        <input
          type="search"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={t("placeholder")}
          aria-label={t("inputLabel")}
          autoFocus
          className="border-border bg-surface text-foreground placeholder:text-muted-foreground focus:border-primary h-12 w-full border pr-12 pl-12 text-base transition-colors outline-none"
        />
        {input && (
          <button
            type="button"
            onClick={() => setInput("")}
            aria-label={t("clear")}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute top-1/2 right-3 flex size-8 -translate-y-1/2 items-center justify-center outline-none focus-visible:ring-2"
          >
            <X className="size-5" aria-hidden />
          </button>
        )}
      </div>

      {/* Genre facet (SEARCH-04) */}
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-2">
        <span className="text-muted-foreground text-center text-xs font-medium tracking-wide uppercase">
          {t("filtersLabel")}
        </span>
        <div className="flex flex-wrap justify-center gap-2">
          {ANIME_GENRES.map((genre) => {
            const active = genres.includes(genre);
            return (
              <button
                key={genre}
                type="button"
                onClick={() => toggleGenre(genre)}
                aria-pressed={active}
                className={cn(
                  "focus-visible:ring-ring border px-3 py-1.5 text-sm transition-colors outline-none focus-visible:ring-2",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-surface text-muted-foreground hover:border-primary/60 hover:text-foreground",
                )}
              >
                {genre}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results region */}
      <section aria-live="polite" className="min-h-[40vh]">
        {!hasCriteria ? (
          <StatusBlock
            icon={<Search className="size-8" aria-hidden />}
            title={t("idlePrompt")}
            hint={t("idleHint")}
          />
        ) : isInitialLoading ? (
          <SearchResultsSkeleton />
        ) : showError ? (
          <StatusBlock
            icon={<SearchX className="size-8" aria-hidden />}
            title={t("error")}
            action={
              <button
                type="button"
                onClick={() => refetch()}
                className="border-border bg-surface hover:border-primary/60 hover:text-foreground text-muted-foreground inline-flex items-center gap-2 border px-4 py-2 text-sm font-medium transition-colors"
              >
                <RotateCw className="size-4" aria-hidden />
                {t("retry")}
              </button>
            }
          />
        ) : showEmpty ? (
          <StatusBlock
            icon={<SearchX className="size-8" aria-hidden />}
            title={t("noResults")}
            hint={t("noResultsHint")}
          />
        ) : (
          <>
            {q && (
              <p className="text-muted-foreground mb-4 text-sm">
                {t("resultsFor", { query: q })}
              </p>
            )}
            <SearchResultsGrid items={items} />
            {data?.hasNextPage && (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={() => setPage((prev) => prev + 1)}
                  disabled={isFetching}
                  className="border-border bg-surface hover:border-primary/60 hover:text-foreground text-foreground inline-flex items-center gap-2 border px-6 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isFetching && (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  )}
                  {isFetching ? t("loadingMore") : t("loadMore")}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

interface StatusBlockProps {
  icon: React.ReactNode;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}

/** Centered idle / empty / error placeholder shared by the results region. */
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
