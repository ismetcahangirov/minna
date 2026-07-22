"use client";

import { SkipForward, Volume2, VolumeX } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

import type { PreRollAd as PreRollAdData } from "@/lib/ads/queries";

interface PreRollAdProps {
  ad: PreRollAdData;
  /** Called when the ad is skipped, finishes, or fails to load. */
  onComplete: () => void;
}

/**
 * Pre-roll ad overlay (PLAYER-02). Covers the video frame exactly and plays the
 * admin-supplied ad before the episode. A countdown runs for
 * `ad.skipAfterSeconds` (admin-configured, never hardcoded); after it the
 * "Skip ad" button unlocks in the bottom-right, YouTube-style. A shorter ad
 * auto-advances when it ends.
 *
 * Robust by design: elapsed time is tracked on a 1s interval rather than only
 * the video clock, so the skip gate still unlocks if the ad url is broken, and
 * a load error completes immediately so playback is never blocked.
 *
 * Design system: black surface, sharp corners, flat scrims, red accent.
 */
export function PreRollAd({ ad, onComplete }: PreRollAdProps) {
  const t = useTranslations("player");
  const videoRef = useRef<HTMLVideoElement>(null);
  const [elapsed, setElapsed] = useState(0);
  // Autoplay policies require a muted start; the viewer can unmute.
  const [muted, setMuted] = useState(true);

  const skipAfter = Math.max(0, ad.skipAfterSeconds);
  const remaining = Math.max(0, Math.ceil(skipAfter - elapsed));
  const canSkip = elapsed >= skipAfter;

  useEffect(() => {
    const timer = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    void video.play().catch(() => {
      // Autoplay blocked entirely — don't strand the viewer on the ad.
    });
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }, []);

  return (
    <div className="absolute inset-0 z-20 bg-black">
      <video
        ref={videoRef}
        src={ad.videoUrl}
        className="h-full w-full"
        playsInline
        onEnded={onComplete}
        onError={onComplete}
      />

      {/* Advertisement badge */}
      <div className="absolute top-3 left-3 flex items-center gap-2">
        <span className="bg-primary text-primary-foreground px-2 py-0.5 text-[11px] font-bold tracking-wide uppercase">
          {t("advertisement")}
        </span>
        {ad.targetUrl && (
          <a
            href={ad.targetUrl}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white/90 hover:text-white"
          >
            {t("visitAdvertiser")}
          </a>
        )}
      </div>

      {/* Mute toggle */}
      <button
        type="button"
        onClick={toggleMute}
        aria-label={muted ? t("unmute") : t("mute")}
        className="hover:text-primary absolute top-3 right-3 bg-black/60 p-2 text-white"
      >
        {muted ? (
          <VolumeX className="size-5" aria-hidden />
        ) : (
          <Volume2 className="size-5" aria-hidden />
        )}
      </button>

      {/* Skip control (countdown → button) */}
      <div className="absolute right-0 bottom-6">
        {canSkip ? (
          <button
            type="button"
            onClick={onComplete}
            className="bg-primary text-primary-foreground hover:bg-primary/80 flex items-center gap-2 px-4 py-2 text-sm font-bold transition-colors"
          >
            {t("skipAd")}
            <SkipForward className="size-4 fill-current" aria-hidden />
          </button>
        ) : (
          <div
            aria-live="polite"
            className="bg-black/70 px-4 py-2 text-sm font-medium text-white/90"
          >
            {t("skipAdIn", { seconds: remaining })}
          </div>
        )}
      </div>
    </div>
  );
}
