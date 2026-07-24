"use client";

import { ChevronLeft, ChevronRight, ListVideo } from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

import { animeHref, watchHref } from "@/lib/anime/href";
import type { PreRollAd as PreRollAdData } from "@/lib/ads/queries";
import { saveWatchProgress } from "@/lib/watch/actions";
import { cn } from "@/lib/utils";

import { EmbedPlayer } from "./embed-player";
import { NextEpisodeOverlay } from "./next-episode-overlay";

// The pre-roll ad is optional (only present when an admin has an active ad) and
// non-critical to the first paint, so it is code-split out of the watch bundle
// and fetched on demand when an ad actually needs to render (PERF-03).
const PreRollAd = dynamic(() =>
  import("./pre-roll-ad").then((mod) => mod.PreRollAd),
);

/** Minimal neighbouring-episode reference for prev/next navigation. */
export interface EpisodeRef {
  id: string;
  number: number;
}

interface WatchExperienceProps {
  animeId: string;
  /** Anime title, denormalized into saved progress for the profile history. */
  animeTitle: string;
  episode: { id: string; number: number; title: string | null };
  prevEpisode: EpisodeRef | null;
  nextEpisode: EpisodeRef | null;
  ad: PreRollAdData | null;
  poster: string | null;
  /** Resume position in seconds (PLAYER-05), seeded into the progress writer. */
  initialTime: number;
  isAuthenticated: boolean;
}

/** How often (ms) the throttled progress writer flushes to the server. */
const SAVE_INTERVAL_MS = 15_000;

/**
 * Watch experience orchestrator (EPIC-06). Sequences the pre-roll ad
 * (PLAYER-02/03) into the custom player (PLAYER-01), surfaces the next-episode
 * overlay on end (PLAYER-04), and persists throttled watch progress (PLAYER-05).
 *
 * Client boundary for the otherwise server-rendered watch route: only playback
 * needs interactivity, so the surrounding page stays a server component.
 */
export function WatchExperience({
  animeId,
  animeTitle,
  episode,
  prevEpisode,
  nextEpisode,
  ad,
  poster,
  initialTime,
  isAuthenticated,
}: WatchExperienceProps) {
  const t = useTranslations("player");
  const router = useRouter();

  // Gate the player behind the pre-roll ad when one is configured (PLAYER-02/03).
  const [adDone, setAdDone] = useState(!ad);
  const [showNext, setShowNext] = useState(false);

  // Latest playback position, kept in a ref so timeupdate never re-renders.
  const latest = useRef({ position: initialTime, duration: 0 });
  const nextHref = nextEpisode
    ? watchHref(animeId, nextEpisode.number, animeTitle)
    : null;

  const flushProgress = useCallback(() => {
    if (!isAuthenticated) return;
    const { position, duration } = latest.current;
    if (position <= 0) return;
    void saveWatchProgress({
      animeId,
      episodeId: episode.id,
      episodeNumber: episode.number,
      positionSeconds: position,
      durationSeconds: duration || null,
      title: animeTitle,
      image: poster,
    });
  }, [
    animeId,
    animeTitle,
    poster,
    episode.id,
    episode.number,
    isAuthenticated,
  ]);

  // Throttled persistence: periodic flush + flush when the tab is hidden or the
  // component unmounts (episode change / navigation away). Never a write per
  // timeupdate.
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(flushProgress, SAVE_INTERVAL_MS);
    const onHide = () => {
      if (document.visibilityState === "hidden") flushProgress();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flushProgress);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flushProgress);
      flushProgress();
    };
  }, [flushProgress, isAuthenticated]);

  const handleProgress = useCallback((position: number, duration: number) => {
    latest.current = { position, duration };
  }, []);

  const handleEnded = useCallback(() => {
    flushProgress();
    if (nextEpisode) setShowNext(true);
  }, [flushProgress, nextEpisode]);

  const goToNext = useCallback(() => {
    if (nextHref) router.push(nextHref);
  }, [nextHref, router]);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative w-full overflow-hidden bg-black">
        {adDone ? (
          <EmbedPlayer
            animeId={animeId}
            episodeNumber={episode.number}
            animeTitle={animeTitle}
            poster={poster}
            onProgress={handleProgress}
            onEnded={handleEnded}
          />
        ) : (
          <div className="relative aspect-video w-full bg-black">
            {poster && (
              <Image
                src={poster}
                alt=""
                fill
                sizes="100vw"
                className="object-cover opacity-40"
              />
            )}
            {ad && <PreRollAd ad={ad} onComplete={() => setAdDone(true)} />}
          </div>
        )}

        {showNext && nextEpisode && (
          <NextEpisodeOverlay
            episodeNumber={nextEpisode.number}
            onPlay={goToNext}
            onCancel={() => setShowNext(false)}
          />
        )}
      </div>

      {/* Episode navigation — always available (PLAYER-04). */}
      <div className="flex items-center justify-between gap-3">
        <EpisodeNavButton
          href={
            prevEpisode
              ? watchHref(animeId, prevEpisode.number, animeTitle)
              : null
          }
          label={t("prevEpisode")}
          icon="prev"
        />

        <Link
          href={animeHref(animeId, animeTitle)}
          className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm font-medium transition-colors"
        >
          <ListVideo className="size-4" aria-hidden />
          <span className="hidden sm:inline">{t("backToAnime")}</span>
        </Link>

        <EpisodeNavButton
          href={nextHref}
          label={t("nextEpisode")}
          icon="next"
        />
      </div>
    </div>
  );
}

function EpisodeNavButton({
  href,
  label,
  icon,
}: {
  href: string | null;
  label: string;
  icon: "prev" | "next";
}) {
  const Icon = icon === "prev" ? ChevronLeft : ChevronRight;
  const content = (
    <>
      {icon === "prev" && <Icon className="size-4" aria-hidden />}
      <span className="hidden sm:inline">{label}</span>
      {icon === "next" && <Icon className="size-4" aria-hidden />}
    </>
  );

  const base =
    "flex items-center gap-1.5 border px-3 py-2 text-sm font-medium transition-colors";

  if (!href) {
    return (
      <span
        aria-disabled
        className={cn(
          base,
          "border-border/50 text-muted-foreground/40 cursor-not-allowed",
        )}
      >
        {content}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        base,
        "border-border text-foreground hover:border-primary/60 hover:bg-muted",
      )}
    >
      {content}
    </Link>
  );
}
