"use client";

import {
  Check,
  Loader2,
  Maximize,
  Minimize,
  Pause,
  Play,
  Settings,
  Subtitles,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import type { EpisodeSource, EpisodeSubtitle } from "@/lib/anime/types";
import { cn } from "@/lib/utils";

import { formatTime } from "./format-time";

interface VideoPlayerProps {
  sources: EpisodeSource[];
  subtitles: EpisodeSubtitle[];
  poster?: string | null;
  /** Resume position in seconds (PLAYER-05). */
  initialTime?: number;
  autoPlay?: boolean;
  /** Fired (throttled by the parent) with the current position and duration. */
  onProgress?: (positionSeconds: number, durationSeconds: number) => void;
  onEnded?: () => void;
}

const HIDE_CONTROLS_MS = 2500;

// Order quality rungs high→low so "1080p" leads and adaptive "default" trails.
function qualityRank(quality: string): number {
  const numeric = Number.parseInt(quality, 10);
  return Number.isFinite(numeric) ? numeric : 0;
}

/**
 * Custom video player (PLAYER-01): play/pause, seekable progress bar, volume,
 * fullscreen, quality selection and subtitle tracks. Native-first — it drives a
 * single `<video>` element; HLS playlists play where the browser supports them
 * natively (Safari/iOS), progressive mp4 everywhere.
 *
 * Design system: black surface, sharp corners, flat opacity scrims (no
 * gradient), Netflix-red accent, lucide icons, i18n labels (no hardcoded text).
 * When `sources` is empty it renders an unavailable state instead of an empty
 * frame — the public Consumet instance is deprecated, so this is the norm until
 * a self-hosted origin is configured.
 */
export function VideoPlayer({
  sources,
  subtitles,
  poster,
  initialTime = 0,
  autoPlay = false,
  onProgress,
  onEnded,
}: VideoPlayerProps) {
  const t = useTranslations("player");

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Preserve position across quality switches (source swap reloads the video).
  const resumeRef = useRef(initialTime);

  const orderedSources = useMemo(
    () =>
      [...sources].sort(
        (a, b) => qualityRank(b.quality) - qualityRank(a.quality),
      ),
    [sources],
  );

  const [qualityIndex, setQualityIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(initialTime);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [menu, setMenu] = useState<"quality" | "subtitles" | null>(null);
  const [subtitleIndex, setSubtitleIndex] = useState(-1);

  const activeSource = orderedSources[qualityIndex] ?? orderedSources[0];

  const revealControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      // Keep controls up while a menu is open or the video is paused.
      setControlsVisible((visible) => {
        const video = videoRef.current;
        if (video?.paused) return visible;
        return false;
      });
    }, HIDE_CONTROLS_MS);
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play().catch(() => setPlaying(false));
    } else {
      video.pause();
    }
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }, []);

  const seekTo = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    const clamped = Math.max(0, Math.min(seconds, video.duration || seconds));
    video.currentTime = clamped;
    setCurrentTime(clamped);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    } else {
      void container.requestFullscreen().catch(() => {});
    }
  }, []);

  // --- Video element event wiring -----------------------------------------

  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration || 0);
    if (resumeRef.current > 0 && resumeRef.current < video.duration) {
      video.currentTime = resumeRef.current;
    }
    if (autoPlay) void video.play().catch(() => {});
  }, [autoPlay]);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
    resumeRef.current = video.currentTime;
    if (video.duration) onProgress?.(video.currentTime, video.duration);
  }, [onProgress]);

  // Fullscreen state is owned by the browser — mirror it.
  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Toggle the selected text track whenever the choice changes.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const tracks = video.textTracks;
    for (let i = 0; i < tracks.length; i += 1) {
      tracks[i].mode = i === subtitleIndex ? "showing" : "hidden";
    }
  }, [subtitleIndex, activeSource]);

  const onSeekPointer = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const bar = event.currentTarget;
      const rect = bar.getBoundingClientRect();
      const ratio = (event.clientX - rect.left) / rect.width;
      seekTo(ratio * (videoRef.current?.duration || 0));
    },
    [seekTo],
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      switch (event.key) {
        case " ":
        case "k":
          event.preventDefault();
          togglePlay();
          break;
        case "ArrowRight":
          seekTo(currentTime + 5);
          break;
        case "ArrowLeft":
          seekTo(currentTime - 5);
          break;
        case "f":
          toggleFullscreen();
          break;
        case "m":
          toggleMute();
          break;
        default:
          break;
      }
      revealControls();
    },
    [
      currentTime,
      revealControls,
      seekTo,
      toggleFullscreen,
      toggleMute,
      togglePlay,
    ],
  );

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (orderedSources.length === 0) {
    return (
      <div className="bg-surface text-muted-foreground border-border flex aspect-video w-full flex-col items-center justify-center gap-2 border text-center">
        <p className="text-foreground text-sm font-medium">
          {t("unavailableTitle")}
        </p>
        <p className="max-w-md px-6 text-xs">{t("unavailableBody")}</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="group/player relative aspect-video w-full overflow-hidden bg-black outline-none select-none"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerMove={revealControls}
      onPointerLeave={() =>
        !videoRef.current?.paused && setControlsVisible(false)
      }
    >
      <video
        ref={videoRef}
        key={activeSource.url}
        src={activeSource.url}
        poster={poster ?? undefined}
        className="h-full w-full bg-black"
        playsInline
        onClick={togglePlay}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onWaiting={() => setWaiting(true)}
        onPlaying={() => setWaiting(false)}
        onVolumeChange={() => {
          const video = videoRef.current;
          if (!video) return;
          setVolume(video.volume);
          setMuted(video.muted);
        }}
        onEnded={() => {
          setPlaying(false);
          onEnded?.();
        }}
      >
        {subtitles.map((track, index) => (
          <track
            key={track.url}
            kind="subtitles"
            src={track.url}
            label={track.lang}
            default={index === subtitleIndex}
          />
        ))}
      </video>

      {/* Buffering spinner */}
      {waiting && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Loader2 className="text-primary size-10 animate-spin" aria-hidden />
        </div>
      )}

      {/* Center play affordance while paused */}
      {!playing && !waiting && (
        <button
          type="button"
          onClick={togglePlay}
          aria-label={t("play")}
          className="absolute inset-0 flex items-center justify-center bg-black/30"
        >
          <span className="bg-primary text-primary-foreground flex size-16 items-center justify-center">
            <Play className="size-7 fill-current" aria-hidden />
          </span>
        </button>
      )}

      {/* Control bar */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-black/70 px-3 pt-2 pb-2 transition-opacity duration-200 sm:px-4",
          controlsVisible ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        {/* Seek bar */}
        <div
          role="slider"
          aria-label={t("seek")}
          aria-valuemin={0}
          aria-valuemax={Math.floor(duration)}
          aria-valuenow={Math.floor(currentTime)}
          tabIndex={0}
          onPointerDown={onSeekPointer}
          className="group/seek relative flex h-4 cursor-pointer items-center"
        >
          <div className="bg-muted-foreground/40 h-1 w-full">
            <div
              className="bg-primary relative h-full"
              style={{ width: `${progress}%` }}
            >
              <span className="bg-primary absolute top-1/2 right-0 size-3 translate-x-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover/seek:opacity-100" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-white">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? t("pause") : t("play")}
            className="hover:text-primary transition-colors"
          >
            {playing ? (
              <Pause className="size-5" aria-hidden />
            ) : (
              <Play className="size-5 fill-current" aria-hidden />
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? t("unmute") : t("mute")}
              className="hover:text-primary transition-colors"
            >
              {muted || volume === 0 ? (
                <VolumeX className="size-5" aria-hidden />
              ) : (
                <Volume2 className="size-5" aria-hidden />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              aria-label={t("volume")}
              onChange={(event) => {
                const video = videoRef.current;
                if (!video) return;
                const next = Number(event.target.value);
                video.volume = next;
                video.muted = next === 0;
              }}
              className="accent-primary hidden h-1 w-20 cursor-pointer sm:block"
            />
          </div>

          <span className="text-xs text-white/90 tabular-nums">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <div className="flex-1" />

          {subtitles.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setMenu((m) => (m === "subtitles" ? null : "subtitles"))
                }
                aria-label={t("subtitles")}
                className={cn(
                  "hover:text-primary transition-colors",
                  subtitleIndex >= 0 && "text-primary",
                )}
              >
                <Subtitles className="size-5" aria-hidden />
              </button>
              {menu === "subtitles" && (
                <Menu>
                  <MenuItem
                    active={subtitleIndex === -1}
                    onClick={() => {
                      setSubtitleIndex(-1);
                      setMenu(null);
                    }}
                  >
                    {t("subtitlesOff")}
                  </MenuItem>
                  {subtitles.map((track, index) => (
                    <MenuItem
                      key={track.url}
                      active={subtitleIndex === index}
                      onClick={() => {
                        setSubtitleIndex(index);
                        setMenu(null);
                      }}
                    >
                      {track.lang}
                    </MenuItem>
                  ))}
                </Menu>
              )}
            </div>
          )}

          {orderedSources.length > 1 && (
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setMenu((m) => (m === "quality" ? null : "quality"))
                }
                aria-label={t("quality")}
                className="hover:text-primary transition-colors"
              >
                <Settings className="size-5" aria-hidden />
              </button>
              {menu === "quality" && (
                <Menu>
                  {orderedSources.map((source, index) => (
                    <MenuItem
                      key={source.url}
                      active={qualityIndex === index}
                      onClick={() => {
                        setQualityIndex(index);
                        setMenu(null);
                      }}
                    >
                      {source.quality}
                    </MenuItem>
                  ))}
                </Menu>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label={fullscreen ? t("exitFullscreen") : t("fullscreen")}
            className="hover:text-primary transition-colors"
          >
            {fullscreen ? (
              <Minimize className="size-5" aria-hidden />
            ) : (
              <Maximize className="size-5" aria-hidden />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Flat pop-over surface for the quality/subtitle menus (sharp corners). */
function Menu({ children }: { children: React.ReactNode }) {
  return (
    <ul className="border-border bg-surface absolute right-0 bottom-full mb-2 min-w-32 border py-1 text-sm">
      {children}
    </ul>
  );
}

function MenuItem({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="hover:bg-muted flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left text-white/90"
      >
        {children}
        {active && <Check className="text-primary size-3.5" aria-hidden />}
      </button>
    </li>
  );
}
