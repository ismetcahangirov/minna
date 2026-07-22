import { AnimeCard, AnimeCardSkeleton } from "@/components/anime/anime-card";
import type { AnimeSummary } from "@/lib/anime/types";

const gridClass =
  "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5";

interface SearchResultsGridProps {
  items: AnimeSummary[];
  /** Localized "Ep" prefix passed through to the cards. */
  episodeLabel?: string;
}

/**
 * Responsive grid of 16:9 {@link AnimeCard}s for the search results (SEARCH-02).
 * Reuses the home/detail card so hover, ratings and links stay consistent.
 */
export function SearchResultsGrid({
  items,
  episodeLabel,
}: SearchResultsGridProps) {
  return (
    <div className={gridClass}>
      {items.map((anime, index) => (
        <AnimeCard
          key={`${anime.id}-${index}`}
          anime={anime}
          episodeLabel={episodeLabel}
        />
      ))}
    </div>
  );
}

/** Placeholder grid shown while the first page of results loads (no CLS). */
export function SearchResultsSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className={gridClass}>
      {Array.from({ length: count }).map((_, index) => (
        <AnimeCardSkeleton key={index} />
      ))}
    </div>
  );
}
