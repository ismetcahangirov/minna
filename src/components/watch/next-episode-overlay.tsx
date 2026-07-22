"use client";

import { Play, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

interface NextEpisodeOverlayProps {
  episodeNumber: number;
  /** Seconds to auto-advance after the current episode ends. */
  countdownSeconds?: number;
  onPlay: () => void;
  onCancel: () => void;
}

/**
 * "Up next" overlay shown when an episode ends and a next one exists
 * (PLAYER-04), YouTube-style. Auto-advances after a countdown; the viewer can
 * play immediately or cancel. Design system: flat black scrim, sharp corners,
 * red accent.
 */
export function NextEpisodeOverlay({
  episodeNumber,
  countdownSeconds = 8,
  onPlay,
  onCancel,
}: NextEpisodeOverlayProps) {
  const t = useTranslations("player");
  const [remaining, setRemaining] = useState(countdownSeconds);

  useEffect(() => {
    if (remaining <= 0) {
      onPlay();
      return;
    }
    const timer = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining, onPlay]);

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black/80 px-4 text-center">
      <p className="text-muted-foreground text-xs tracking-widest uppercase">
        {t("upNext")}
      </p>
      <p className="text-foreground text-lg font-bold sm:text-xl">
        {t("episodeLabel", { number: episodeNumber })}
      </p>
      <p className="text-muted-foreground text-sm" aria-live="polite">
        {t("nextEpisodeIn", { seconds: remaining })}
      </p>
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={onPlay}
          className="bg-primary text-primary-foreground hover:bg-primary/80 flex items-center gap-2 px-4 py-2 text-sm font-bold transition-colors"
        >
          <Play className="size-4 fill-current" aria-hidden />
          {t("playNow")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="border-border text-foreground hover:bg-muted flex items-center gap-2 border px-4 py-2 text-sm font-medium transition-colors"
        >
          <X className="size-4" aria-hidden />
          {t("cancel")}
        </button>
      </div>
    </div>
  );
}
