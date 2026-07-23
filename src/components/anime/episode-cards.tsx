"use client";

import { ArrowDownUp, Check, Film, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { AnimeEpisode } from "@/lib/anime/types";

/** Per-episode watched/resume state, keyed by episode id. */
type WatchState = { completed: boolean; progress: number };

interface EpisodeCardsProps {
  animeId: string;
  episodes: AnimeEpisode[];
  /** Anime cover used as each card's thumbnail (episodes carry no art). */
  thumbnail: string | null;
  /** Signed-in viewer's watched/resume state per episode id (empty if none). */
  watchStates?: Record<string, WatchState>;
}

/** How many cards to reveal per infinite-scroll step. */
const PAGE_SIZE = 24;

/**
 * Full-width, vertically stacked episode cards (openani-style) with
 * IntersectionObserver infinite scroll. All episodes are already in memory
 * (fetched server-side); this only paginates rendering so a long series doesn't
 * mount hundreds of rows at once. Client component: order toggle + reveal state.
 *
 * Design system: sharp corners, flat surfaces, red accent on hover, lucide
 * icons — never emoji.
 */
export function EpisodeCards({
  animeId,
  episodes,
  thumbnail,
  watchStates = {},
}: EpisodeCardsProps) {
  const t = useTranslations("detail");
  const [descending, setDescending] = useState(false);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const ordered = useMemo(() => {
    const sorted = [...episodes].sort((a, b) => a.number - b.number);
    return descending ? sorted.reverse() : sorted;
  }, [episodes, descending]);

  const shown = ordered.slice(0, visible);
  const hasMore = visible < ordered.length;

  // Reveal the next page when the sentinel scrolls into view. The observer
  // callback runs outside the effect body, so the setState is not a
  // synchronous-in-effect update.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible((count) => count + PAGE_SIZE);
        }
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
    // Re-observe after each reveal: a fresh observe() on a still-intersecting
    // sentinel re-fires, so a tall viewport keeps filling until it scrolls off.
  }, [hasMore, visible]);

  if (episodes.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("noEpisodes")}</p>;
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-foreground text-lg font-bold tracking-tight sm:text-xl">
          {t("episodes")}
          <span className="text-muted-foreground ml-2 text-sm font-normal">
            {episodes.length}
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

      <ul className="flex flex-col gap-3">
        {shown.map((episode) => {
          const state = watchStates[episode.id];
          const inProgress = state && !state.completed && state.progress > 0;
          return (
            <li key={episode.id}>
              <Link
                href={`/watch/${animeId}/${encodeURIComponent(episode.id)}`}
                className="group border-border bg-surface hover:border-primary/60 flex items-center gap-4 border p-3 transition-colors"
              >
                <div className="border-border bg-muted relative aspect-video w-32 shrink-0 overflow-hidden border sm:w-44">
                  {thumbnail ? (
                    <Image
                      src={thumbnail}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 128px, 176px"
                      className={
                        state?.completed
                          ? "object-cover opacity-40"
                          : "object-cover"
                      }
                    />
                  ) : (
                    <div className="text-muted-foreground flex h-full w-full items-center justify-center">
                      <Film className="size-6" aria-hidden />
                    </div>
                  )}

                  {/* Watched tick. */}
                  {state?.completed && (
                    <span
                      className="bg-primary text-primary-foreground absolute top-0 right-0 flex size-6 items-center justify-center"
                      title={t("watched")}
                    >
                      <Check className="size-4" aria-label={t("watched")} />
                    </span>
                  )}

                  {/* Resume progress bar. */}
                  {inProgress && (
                    <span className="absolute inset-x-0 bottom-0 h-1 bg-black/60">
                      <span
                        className="bg-primary block h-full"
                        style={{
                          width: `${Math.round(state.progress * 100)}%`,
                        }}
                      />
                    </span>
                  )}

                  <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                    <span className="bg-primary text-primary-foreground flex size-9 items-center justify-center">
                      <Play className="size-4 fill-current" aria-hidden />
                    </span>
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                    {t("episodeLabel", { number: episode.number })}
                  </span>
                  <h3 className="text-foreground group-hover:text-primary mt-0.5 line-clamp-1 text-sm font-semibold transition-colors sm:text-base">
                    {episode.title ??
                      t("episodeLabel", { number: episode.number })}
                  </h3>
                  {episode.description && (
                    <p className="text-muted-foreground mt-1 line-clamp-2 hidden text-xs sm:block">
                      {episode.description}
                    </p>
                  )}
                </div>

                <Play
                  className="text-muted-foreground group-hover:text-primary size-5 shrink-0 transition-colors"
                  aria-hidden
                />
              </Link>
            </li>
          );
        })}
      </ul>

      {hasMore && <div ref={sentinelRef} aria-hidden className="h-px w-full" />}
    </div>
  );
}
