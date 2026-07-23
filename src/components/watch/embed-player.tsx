"use client";

import { Loader2, Play } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/** Audio track the embed serves: original-with-subtitles or dubbed. */
type AudioLang = "sub" | "dub";

/**
 * Embed host that resolves a playable stream in the *viewer's* browser. This is
 * deliberately not a server-side scrape: the anime source sites block datacenter
 * IPs (Cloudflare 403), so any host-side fetch fails, but the same request from
 * a real browser succeeds. Addressing by AniList id + episode number matches the
 * synthesized episode list (see `@/lib/anime/detail`).
 */
const EMBED_ORIGIN = "https://megaplay.buzz";

interface EmbedPlayerProps {
  /** AniList id — the embed maps this + episode number to a stream. */
  animeId: string;
  episodeNumber: number;
  animeTitle: string;
  poster: string | null;
  /** Throttled upward: latest playback position + duration (PLAYER-05). */
  onProgress: (position: number, duration: number) => void;
  /** Fires once when the embed reports the episode finished (PLAYER-04). */
  onEnded: () => void;
}

/**
 * Iframe embed player (EPIC-06). The third-party player owns playback controls,
 * quality and subtitle rendering; this component owns the audio-language toggle,
 * a loading state, an unavailable state, and bridges the embed's `postMessage`
 * telemetry to the watch-progress writer.
 */
export function EmbedPlayer({
  animeId,
  episodeNumber,
  animeTitle,
  poster,
  onProgress,
  onEnded,
}: EmbedPlayerProps) {
  const t = useTranslations("player");
  const [lang, setLang] = useState<AudioLang>("sub");
  // Facade gate (EPIC-06): the embed is not mounted until the viewer presses our
  // own play button. That first click lands on us — not inside the third-party
  // player, whose in-frame click is what opens its pop-up/redirect ads. Once
  // activated we load the embed with `autostart`, so playback begins from our
  // gesture and the viewer never has to click into the ad-serving frame to start.
  const [activated, setActivated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);
  // Remembers the last src we already reported "ended" for, so `complete` fires
  // onEnded once per episode. Written from the message callback (never render).
  const endedForSrc = useRef<string | null>(null);

  const src = `${EMBED_ORIGIN}/stream/ani/${encodeURIComponent(
    animeId,
  )}/${episodeNumber}/${lang}?autostart=true`;

  // Reset transient UI state when the source changes (episode or audio switch)
  // via the render-phase "adjust state" pattern — this repo forbids setState in
  // effects (react-hooks/set-state-in-effect) and ref writes during render.
  const [trackedSrc, setTrackedSrc] = useState(src);
  if (trackedSrc !== src) {
    setTrackedSrc(src);
    setLoading(true);
    setErrored(false);
  }

  // Bridge the embed's postMessage telemetry. The exact envelope isn't
  // contractual, so parse defensively — playback never depends on this, only
  // progress/next-episode do.
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (!event.origin.includes("megaplay")) return;
      const data = event.data;
      if (!data || typeof data !== "object") return;

      const type = (data.type ?? data.event ?? data.name) as string | undefined;
      const payload = (data.data ?? data) as Record<string, unknown>;

      const position = Number(payload.currentTime ?? payload.time);
      const duration = Number(payload.duration);
      if (Number.isFinite(position) && position > 0) {
        onProgress(position, Number.isFinite(duration) ? duration : 0);
      }

      if (type === "complete" || type === "ended") {
        if (endedForSrc.current !== src) {
          endedForSrc.current = src;
          onEnded();
        }
      }
      if (type === "error") setErrored(true);
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onProgress, onEnded, src]);

  const selectLang = useCallback((next: AudioLang) => setLang(next), []);

  return (
    <div className="relative aspect-video w-full bg-black">
      {errored ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
          <p className="text-foreground text-base font-semibold">
            {t("unavailableTitle")}
          </p>
          <p className="text-muted-foreground max-w-md text-sm">
            {t("unavailableBody")}
          </p>
        </div>
      ) : (
        activated && (
          <iframe
            key={src}
            src={src}
            title={`${animeTitle} — ${t("episodeLabel", { number: episodeNumber })}`}
            className="absolute inset-0 size-full border-0"
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            allowFullScreen
            onLoad={() => setLoading(false)}
          />
        )
      )}

      {/* Facade: the poster + our own play button, shown until the viewer starts
          playback. Clicking it (not the embed) is what avoids the first-click ad;
          see the `activated` state above. */}
      {!activated && !errored && (
        <button
          type="button"
          onClick={() => setActivated(true)}
          aria-label={t("play")}
          className="group absolute inset-0 z-20 flex items-center justify-center bg-black"
        >
          {poster && (
            <Image
              src={poster}
              alt=""
              fill
              sizes="100vw"
              className="object-cover opacity-40 transition-opacity group-hover:opacity-55"
            />
          )}
          <span className="bg-primary text-primary-foreground group-hover:bg-primary/90 relative flex size-16 items-center justify-center transition-colors">
            <Play className="size-7 fill-current" />
          </span>
        </button>
      )}

      {activated && loading && !errored && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black">
          {poster && (
            <Image
              src={poster}
              alt=""
              fill
              sizes="100vw"
              className="object-cover opacity-30"
            />
          )}
          <Loader2
            className="text-primary relative size-8 animate-spin"
            aria-label={t("loadingPlayer")}
          />
        </div>
      )}

      {/* Audio-language toggle. Overlaid top-right; the embed's own controls sit
          along the bottom, so this stays clear of them. */}
      <div className="absolute top-2 right-2 z-30 flex border border-black/40 bg-black/70">
        <LangButton
          active={lang === "sub"}
          onClick={() => selectLang("sub")}
          label={t("subbed")}
        />
        <LangButton
          active={lang === "dub"}
          onClick={() => selectLang("dub")}
          label={t("dubbed")}
        />
      </div>
    </div>
  );
}

function LangButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "px-3 py-1.5 text-xs font-bold tracking-wide uppercase transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}
