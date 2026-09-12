"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";

import { useAnimeUserState } from "@/lib/hooks/use-viewer";

interface EpisodeWatchMarksProps {
  /** The anime the list belongs to — the key the states are read under. */
  animeId: string;
  /** This card's episode id, as it is stored on the progress row. */
  episodeId: string;
}

/**
 * The watched tick and resume bar on one episode card (PERF-05).
 *
 * The marks are the only part of an episode card that differs per viewer, so
 * they are the only part read in the browser; the card itself — title, still,
 * link — stays server-rendered, which is what keeps the episode list in the
 * crawled HTML while the page around it is cached at the edge.
 *
 * Every card on the page shares one request: `useAnimeUserState` is keyed by
 * the anime, not the episode, so twenty cards read one response.
 *
 * The "already watched" dim is an overlay rather than opacity on the image
 * below, because the image is server-rendered and does not know who is looking.
 */
export function EpisodeWatchMarks({
  animeId,
  episodeId,
}: EpisodeWatchMarksProps) {
  const t = useTranslations("detail");
  const { state } = useAnimeUserState(animeId);

  const watched = state.watch[episodeId];
  if (!watched) return null;

  const inProgress = !watched.completed && watched.progress > 0;

  return (
    <>
      {watched.completed && (
        <>
          <span aria-hidden className="absolute inset-0 bg-black/60" />
          <span
            className="bg-primary text-primary-foreground absolute top-0 right-0 flex size-6 items-center justify-center"
            title={t("watched")}
          >
            <Check className="size-4" aria-label={t("watched")} />
          </span>
        </>
      )}

      {inProgress && (
        <span className="absolute inset-x-0 bottom-0 h-1 bg-black/60">
          <span
            className="bg-primary block h-full"
            style={{ width: `${Math.round(watched.progress * 100)}%` }}
          />
        </span>
      )}
    </>
  );
}
