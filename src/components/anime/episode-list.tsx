"use client";

import { ArrowDownUp, ChevronDown, ChevronUp, Play } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { CurrentEpisodeBeam } from "@/components/anime/current-episode-beam";
import { EpisodeSearchField } from "@/components/anime/episode-search-field";
import { Button } from "@/components/ui/button";
import { filterEpisodes } from "@/lib/anime/episode-search";
import { watchHref } from "@/lib/anime/href";
import type { AnimeEpisode } from "@/lib/anime/types";
import { cn } from "@/lib/utils";

/**
 * Episodes shown before the list is expanded. A long series would otherwise
 * push the rest of the page far below the player, so the list opens on one
 * screenful and the viewer asks for the remainder. A phone shows one column,
 * so it stops at half that — the extra rows are hidden in CSS rather than by
 * measuring the viewport, which keeps the markup identical on server and
 * client.
 */
const COLLAPSED_COUNT = 20;
const COLLAPSED_COUNT_MOBILE = 10;

interface EpisodeListProps {
  animeId: string;
  /** Anime title — slugged into the readable watch URL. */
  animeTitle: string;
  episodes: AnimeEpisode[];
  /** Episode currently playing, highlighted in the list (watch route). */
  activeEpisodeNumber?: number | null;
}

/**
 * Episode list (DETAIL-02). Server-rendered on first paint (SEO) and hydrated
 * for the order toggle and the search box. Unlike the episodes route — which
 * paginates through the URL — this list holds the whole series already, so it
 * filters in place by episode number or title as you type. Each row links to
 * the watch route; the one playing carries the animated red marker.
 *
 * Design system: sharp corners, flat surfaces, red accent on hover, lucide
 * icons.
 */
export function EpisodeList({
  animeId,
  animeTitle,
  episodes,
  activeEpisodeNumber = null,
}: EpisodeListProps) {
  const t = useTranslations("detail");
  const [descending, setDescending] = useState(false);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);

  const ordered = useMemo(() => {
    const sorted = [...episodes].sort((a, b) => a.number - b.number);
    return descending ? sorted.reverse() : sorted;
  }, [episodes, descending]);

  const matched = useMemo(
    () => filterEpisodes(ordered, query.trim() || null),
    [ordered, query],
  );

  // Collapsed, the list shows one block of episodes: the first one, or — when
  // the episode playing sits further down — the block holding it, so the
  // "now playing" marker is never hidden behind the "show more" button.
  const activeIndex = matched.findIndex(
    (episode) => episode.number === activeEpisodeNumber,
  );
  // Aligned to the mobile count so the playing episode also survives the extra
  // rows a phone hides.
  const blockStart =
    activeIndex > 0
      ? Math.floor(activeIndex / COLLAPSED_COUNT_MOBILE) *
        COLLAPSED_COUNT_MOBILE
      : 0;

  const shown = expanded
    ? matched
    : matched.slice(blockStart, blockStart + COLLAPSED_COUNT);
  const collapsible = matched.length > COLLAPSED_COUNT;

  if (episodes.length === 0) {
    return (
      <section aria-label={t("episodes")}>
        <h2 className="text-foreground mb-4 text-lg font-bold tracking-tight sm:text-xl">
          {t("episodes")}
        </h2>
        <p className="text-muted-foreground text-sm">{t("noEpisodes")}</p>
      </section>
    );
  }

  return (
    <section aria-label={t("episodes")}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-foreground text-lg font-bold tracking-tight sm:text-xl">
            {t("episodes")}
            <span className="text-muted-foreground ml-2 text-sm font-normal">
              {query.trim()
                ? `${matched.length} / ${episodes.length}`
                : episodes.length}
            </span>
          </h2>
          {episodes.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setDescending((value) => !value)}
            >
              <ArrowDownUp aria-hidden />
              {descending ? t("sortDesc") : t("sortAsc")}
            </Button>
          )}
        </div>
        {episodes.length > 1 && (
          <EpisodeSearchField value={query} onValueChange={setQuery} />
        )}
      </div>

      {shown.length === 0 ? (
        <p className="text-muted-foreground border-border bg-surface border p-4 text-sm">
          {t("search.empty", { query: query.trim() })}
        </p>
      ) : (
        <ul
          className={cn(
            "grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3",
            !expanded && "max-sm:[&>li:nth-child(n+11)]:hidden",
          )}
        >
          {shown.map((episode) => {
            const isActive = episode.number === activeEpisodeNumber;
            return (
              <li key={episode.id}>
                <Link
                  href={watchHref(animeId, episode.number, animeTitle)}
                  aria-current={isActive ? "true" : undefined}
                  className={cn(
                    "group bg-surface hover:border-primary/60 hover:bg-muted relative flex items-center gap-3 border p-3 transition-colors",
                    isActive ? "border-primary bg-primary/5" : "border-border",
                  )}
                >
                  {isActive && <CurrentEpisodeBeam />}
                  <span
                    className={cn(
                      "group-hover:bg-primary group-hover:text-primary-foreground flex size-9 shrink-0 items-center justify-center text-sm font-bold transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground",
                    )}
                  >
                    {episode.number}
                  </span>
                  <span
                    className={cn(
                      "line-clamp-1 min-w-0 flex-1 text-sm font-medium",
                      isActive ? "text-primary" : "text-foreground",
                    )}
                  >
                    {episode.title ??
                      t("episodeLabel", { number: episode.number })}
                  </span>
                  {isActive ? (
                    <span className="text-primary shrink-0 text-[0.65rem] font-bold tracking-widest uppercase">
                      {t("nowPlaying")}
                    </span>
                  ) : (
                    <Play
                      className="text-muted-foreground group-hover:text-primary size-4 shrink-0 transition-colors"
                      aria-hidden
                    />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {collapsible && (
        <div className="mt-4 flex justify-center">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
          >
            {expanded ? (
              <>
                <ChevronUp aria-hidden />
                {t("showLess")}
              </>
            ) : (
              <>
                <ChevronDown aria-hidden />
                {t("showMore")}
              </>
            )}
          </Button>
        </div>
      )}
    </section>
  );
}
