"use client";

import { ChevronLeft, ChevronRight, ListVideo } from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

import { Link, useRouter } from "@/i18n/navigation";
import { pickPreRollAd, type PreRollAdPool } from "@/lib/ads/pre-roll";
import { animeHref, watchHref } from "@/lib/anime/href";
import { useWatchProgress } from "@/lib/hooks/use-viewer";
import { saveWatchProgress } from "@/lib/watch/actions";
import { cn } from "@/lib/utils";

import { EmbedPlayer } from "./embed-player";
import { NextEpisodeOverlay } from "./next-episode-overlay";

// The pre-roll ad is optional (only present when an admin has an active ad) and
// non-critical to the first paint, so it is code-split out of the watch bundle
// and fetched on demand when an ad actually needs to render (PERF-03).
//
// Never server-rendered: which ad this is comes out of a random draw made in
// the browser, and rendering the server's own draw into the cached HTML would
// both freeze the rotation and disagree with the client's on hydration.
const PreRollAd = dynamic(
  () => import("./pre-roll-ad").then((mod) => mod.PreRollAd),
  { ssr: false },
);

/** Minimal neighbouring-episode reference for prev/next navigation. */
export interface EpisodeRef {
  id: string;
  number: number;
}

interface WatchExperienceProps {
  animeId: string;
  /**
   * The anime's canonical `{id}-{slug}` segment, resolved by the page.
   *
   * Passed in rather than derived here: the registry is what the proxy
   * redirects to, and building this player's own links from `animeTitle`
   * pointed the next-episode button at a URL that answered 308.
   */
  animeSlug: string;
  /** MyAnimeList id, when known — threaded to the embed's MAL-route fallback. */
  malId: number | null;
  /** Anime title, denormalized into saved progress for the profile history. */
  animeTitle: string;
  episode: { id: string; number: number; title: string | null };
  prevEpisode: EpisodeRef | null;
  nextEpisode: EpisodeRef | null;
  /**
   * Every active pre-roll ad, weights included — one is drawn from it here, in
   * the browser, so the rotation survives the page being cached (PERF-05).
   */
  ads: PreRollAdPool;
  poster: string | null;
  /** Series length, carried into the library entry behind its progress bar. */
  totalEpisodes: number | null;
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
  animeSlug,
  malId,
  animeTitle,
  episode,
  prevEpisode,
  nextEpisode,
  ads,
  poster,
  totalEpisodes,
}: WatchExperienceProps) {
  const t = useTranslations("player");
  const router = useRouter();

  // Who is watching, and where they left off — read here rather than rendered
  // into the page, so the page itself is the same for everyone and cacheable
  // (PERF-05). Both are skipped entirely for a signed-out viewer.
  const { isAuthenticated, progress } = useWatchProgress(animeId, episode.id);

  // One draw per mount. The pool is identical for every viewer (it comes out of
  // the cached HTML); the ad is not.
  const [ad] = useState(() => pickPreRollAd(ads));

  // Gate the player behind the pre-roll ad when one is configured (PLAYER-02/03).
  const [adDone, setAdDone] = useState(ads.length === 0);
  const [showNext, setShowNext] = useState(false);

  // Latest playback position, kept in a ref so timeupdate never re-renders.
  const latest = useRef({ position: 0, duration: 0 });

  // Seed the resume position once it arrives (PLAYER-05), unless playback has
  // already moved past it — the fetch is in flight while the viewer can already
  // be watching, and a stale answer must never rewind a live position. An
  // episode already finished resumes from the start, as it did before.
  useEffect(() => {
    if (!progress || progress.completed) return;
    if (latest.current.position > 0) return;
    latest.current.position = progress.positionSeconds;
  }, [progress]);
  const nextHref = nextEpisode
    ? watchHref(animeSlug, nextEpisode.number)
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
      totalEpisodes,
    });
  }, [
    animeId,
    animeTitle,
    poster,
    totalEpisodes,
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
            malId={malId}
            episodeNumber={episode.number}
            animeTitle={animeTitle}
            poster={poster}
            onProgress={handleProgress}
            onEnded={handleEnded}
          />
        ) : (
          <div className="relative aspect-[16/8.1] w-full bg-black sm:aspect-[16/6.075]">
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
          href={prevEpisode ? watchHref(animeSlug, prevEpisode.number) : null}
          label={t("prevEpisode")}
          shortLabel={t("prev")}
          icon="prev"
        />

        <Link
          href={animeHref(animeSlug)}
          className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm font-medium transition-colors"
        >
          <ListVideo className="size-4" aria-hidden />
          <span>{t("backToAnime")}</span>
        </Link>

        <EpisodeNavButton
          href={nextHref}
          label={t("nextEpisode")}
          shortLabel={t("next")}
          icon="next"
        />
      </div>
    </div>
  );
}

function EpisodeNavButton({
  href,
  label,
  shortLabel,
  icon,
}: {
  href: string | null;
  label: string;
  /** Shown instead of `label` on phones, where the full wording does not fit. */
  shortLabel: string;
  icon: "prev" | "next";
}) {
  const Icon = icon === "prev" ? ChevronLeft : ChevronRight;
  const content = (
    <>
      {icon === "prev" && <Icon className="size-4" aria-hidden />}
      <span className="sm:hidden">{shortLabel}</span>
      <span className="hidden sm:inline">{label}</span>
      {icon === "next" && <Icon className="size-4" aria-hidden />}
    </>
  );

  const base =
    "flex items-center gap-1.5 border px-2.5 py-2 text-xs font-medium transition-colors sm:px-3 sm:text-sm";

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
