"use client";

import {
  Loader2,
  Lock,
  LockOpen,
  Maximize,
  Minimize,
  Play,
} from "lucide-react";
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
  // Whether *our* container is the fullscreen element. The embed's own
  // fullscreen is disabled (see the iframe `allow`), so fullscreen always runs
  // through us — that's what lets the click-shield below sit in the fullscreen
  // layer and swallow stray clicks that would otherwise open the embed's ads.
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Raised after a pop-up ad steals focus. The embed can be left mid-drag on its
  // seek bar (its mouseup is lost when a new tab takes over), so the first mouse
  // move on return scrubs the video. A guard over the frame absorbs that stray
  // move until the viewer clicks to resume — the click never reaches the embed.
  const [recovering, setRecovering] = useState(false);
  // Fullscreen only: lets the viewer lift the click-shield to reach the embed's
  // native controls (volume/quality/subtitles/speed), which we can't drive from
  // outside a cross-origin frame. Default locked (shield on = ad-safe).
  const [unlocked, setUnlocked] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
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
    setRecovering(false);
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

  // Track fullscreen through the browser event so our state stays correct even
  // when the viewer leaves fullscreen with Esc rather than our button.
  useEffect(() => {
    function onFullscreenChange() {
      const full = document.fullscreenElement === containerRef.current;
      setIsFullscreen(full);
      // Re-lock for the next fullscreen session so it always starts ad-safe.
      if (!full) setUnlocked(false);
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  // When a pop-up ad opens a new tab, ours goes hidden — that's the moment the
  // embed's seek-bar drag gets orphaned. Raise the recovery guard so the return
  // mouse move can't scrub. (Only while playing; a plain tab switch just shows
  // the "click to resume" guard, which is harmless.)
  useEffect(() => {
    if (!activated) return;
    function onVisibilityChange() {
      if (document.hidden) setRecovering(true);
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [activated]);

  const selectLang = useCallback((next: AudioLang) => setLang(next), []);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void el.requestFullscreen?.();
    }
  }, []);

  return (
    <div ref={containerRef} className="relative aspect-video w-full bg-black">
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
          // Fullscreen is intentionally NOT delegated to the embed: we run it on
          // our own container so the click-shield can live in the fullscreen
          // layer. The embed still gets autoplay/PiP/DRM.
          <iframe
            key={src}
            src={src}
            title={`${animeTitle} — ${t("episodeLabel", { number: episodeNumber })}`}
            className="absolute inset-0 size-full border-0"
            allow="autoplay; encrypted-media; picture-in-picture"
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

      {/* Click-shield: in fullscreen the embed fills the screen and a click in
          the picture opens its ads. We cover the picture — not the bottom strip,
          where the embed's own play/seek controls sit — with a transparent layer
          that absorbs those clicks. Fullscreen-only, and lifted while `unlocked`
          so the viewer can reach the embed's native menus. */}
      {activated && isFullscreen && !errored && !unlocked && (
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 bottom-[12%] z-20"
        />
      )}

      {/* Lock toggle (fullscreen only): the shield blocks the embed's own
          volume/quality/subtitle/speed menus, which we can't drive from outside
          the frame — so the viewer unlocks to use them, then re-locks. The hint
          makes clear the controls are inert until unlocked. */}
      {activated && isFullscreen && !errored && (
        <div className="absolute top-2 left-2 z-40 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setUnlocked((prev) => !prev)}
            aria-pressed={!unlocked}
            aria-label={unlocked ? t("lockControls") : t("unlockControls")}
            className="text-muted-foreground hover:text-foreground flex items-center border border-black/40 bg-black/70 p-2.5 transition-colors"
          >
            {unlocked ? (
              <LockOpen className="size-5" strokeWidth={2.5} />
            ) : (
              <Lock className="size-5" strokeWidth={2.5} />
            )}
          </button>
          {!unlocked && (
            <span className="border border-white/20 bg-black/80 px-3 py-1.5 text-xs font-semibold text-white">
              {t("unlockControls")}
            </span>
          )}
        </div>
      )}

      {/* Audio-language toggle, top-right and clear of the embed's bottom
          controls. z-40 keeps it above the fullscreen shield. */}
      <div className="absolute top-2 right-2 z-40 flex border border-black/40 bg-black/70">
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

      {/* Fullscreen toggle at the conventional bottom-right, placed over the
          embed's own (now-disabled) fullscreen button so that corner works
          again. z-40 keeps it above the fullscreen shield so it can also exit. */}
      {activated && (
        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? t("exitFullscreen") : t("fullscreen")}
          className="text-muted-foreground hover:text-foreground absolute right-2 bottom-2 z-40 flex items-center border border-black/40 bg-black/70 p-2.5 transition-colors"
        >
          {isFullscreen ? (
            <Minimize className="size-5" strokeWidth={2.5} />
          ) : (
            <Maximize className="size-5" strokeWidth={2.5} />
          )}
        </button>
      )}

      {/* Recovery guard: covers the whole frame after an ad stole focus, so the
          return mouse move can't reach the embed's stuck seek bar and scrub. The
          click that dismisses it is absorbed here, never reaching the embed. */}
      {activated && recovering && !errored && (
        <button
          type="button"
          onClick={() => setRecovering(false)}
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/60"
        >
          <span className="border border-white/20 bg-black/80 px-4 py-2 text-sm font-semibold text-white">
            {t("resumePlayback")}
          </span>
        </button>
      )}
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
