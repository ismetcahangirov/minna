"use client";

import { ArrowDownUp, Play } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import type { AnimeEpisode } from "@/lib/anime/types";

interface EpisodeListProps {
  animeId: string;
  episodes: AnimeEpisode[];
}

/**
 * Episode list (DETAIL-02). Server-rendered on first paint (SEO) and hydrated
 * for the ascending/descending order toggle. Each row links to the watch route
 * (built in EPIC-06). Design system: sharp corners, flat surfaces, red accent
 * on hover, lucide icons.
 */
export function EpisodeList({ animeId, episodes }: EpisodeListProps) {
  const t = useTranslations("detail");
  const [descending, setDescending] = useState(false);

  const ordered = useMemo(() => {
    const sorted = [...episodes].sort((a, b) => a.number - b.number);
    return descending ? sorted.reverse() : sorted;
  }, [episodes, descending]);

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

      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {ordered.map((episode) => (
          <li key={episode.id}>
            <Link
              href={`/watch/${animeId}/${encodeURIComponent(episode.id)}`}
              className="group border-border bg-surface hover:border-primary/60 hover:bg-muted flex items-center gap-3 border p-3 transition-colors"
            >
              <span className="bg-secondary text-secondary-foreground group-hover:bg-primary group-hover:text-primary-foreground flex size-9 shrink-0 items-center justify-center text-sm font-bold transition-colors">
                {episode.number}
              </span>
              <span className="text-foreground line-clamp-1 min-w-0 flex-1 text-sm font-medium">
                {episode.title ?? t("episodeLabel", { number: episode.number })}
              </span>
              <Play
                className="text-muted-foreground group-hover:text-primary size-4 shrink-0 transition-colors"
                aria-hidden
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
