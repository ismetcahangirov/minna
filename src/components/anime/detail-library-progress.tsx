"use client";

import { useTranslations } from "next-intl";

import { LibraryProgressBar } from "@/components/library/progress-bar";
import { useAnimeUserState } from "@/lib/hooks/use-viewer";

interface DetailLibraryProgressProps {
  animeId: string;
  /** Catalog episode count, used when the library row has none of its own. */
  totalEpisodes: number | null;
}

/**
 * How far the viewer is through the series, under the detail page's actions
 * (LIB-04) — read in the browser so the page around it stays cacheable
 * (PERF-05).
 *
 * Renders nothing at all until the entry arrives, and nothing ever for a
 * visitor who has not started the series: the bar is the one piece of the hero
 * that only some viewers have, so reserving its space for everyone would put a
 * permanent gap under the buttons for the many to serve the few.
 */
export function DetailLibraryProgress({
  animeId,
  totalEpisodes,
}: DetailLibraryProgressProps) {
  const t = useTranslations("library");
  const { state } = useAnimeUserState(animeId);

  const entry = state.library;
  if (!entry || entry.episodesWatched <= 0) return null;

  // The library row's own count wins over the catalog's, so a series whose
  // length changed after it was filed keeps a bar that matches its counter.
  const total = entry.totalEpisodes ?? totalEpisodes;

  return (
    <LibraryProgressBar
      watched={entry.episodesWatched}
      total={total}
      label={
        total
          ? t("progress", { watched: entry.episodesWatched, total })
          : t("progressUnknown", { watched: entry.episodesWatched })
      }
      className="mt-5 max-w-md"
    />
  );
}
