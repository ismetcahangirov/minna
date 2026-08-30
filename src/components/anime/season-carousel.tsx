"use client";

import { ChevronLeft, ChevronRight, Film } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  type PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { CurrentEpisodeBeam } from "@/components/anime/current-episode-beam";
import { Link } from "@/i18n/navigation";
import { seasonAnimeHref } from "@/lib/anime/href";
import type { AnimeSeason } from "@/lib/anime/seasons";
import { cn } from "@/lib/utils";

/** How far (px) the peek nudge scrolls before bouncing back. */
const PEEK_PX = 72;
/** Delay (ms) before the nudge starts — let the page settle first. */
const PEEK_DELAY_MS = 600;
/** How long (ms) before the nudge scrolls back. */
const PEEK_HOLD_MS = 450;

interface SeasonCarouselProps {
  seasons: AnimeSeason[];
  /** This title's own canonical detail path — what the active card points at. */
  basePath: string;
  /** Id of the season whose episodes are listed under the rail. */
  activeId: string;
}

/**
 * Responsive season switcher (DETAIL-02). On mobile and tablet (< lg), renders
 * a horizontal slider rail with touch swipe, mouse drag, and side navigation
 * arrows matching the home page rows. On desktop (lg+), wraps neatly in a grid.
 *
 * Every card but the active one is a real link to that season's own detail
 * page — each season is a distinct AniList entry with its own canonical URL,
 * JSON-LD and heading, so this is what gives every season in the chain an
 * internal link pointing at it instead of leaving it discoverable only
 * through the sitemap.
 *
 * On first render (mobile/tablet only), performs a short peek nudge so the user
 * can see at a glance that there are more seasons to scroll through.
 */
export function SeasonCarousel({
  seasons,
  basePath,
  activeId,
}: SeasonCarouselProps) {
  const t = useTranslations("detail.seasons");
  const tHome = useTranslations("home.carousel");

  const railRef = useRef<HTMLUListElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const drag = useRef({
    active: false,
    startX: 0,
    startScroll: 0,
    moved: false,
  });

  const counts = seasons.reduce<Record<string, number>>((acc, s) => {
    acc[s.kind] = (acc[s.kind] ?? 0) + 1;
    return acc;
  }, {});

  function labelFor(season: AnimeSeason): string {
    if (season.kind === "season") return t("season", { number: season.index });
    const word = t(season.kind);
    return counts[season.kind] > 1 ? `${word} ${season.index}` : word;
  }

  /** Sync left/right overflow indicators with the current scroll position. */
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    const sync = () => {
      setCanLeft(rail.scrollLeft > 4);
      setCanRight(rail.scrollLeft + rail.clientWidth < rail.scrollWidth - 4);
    };

    const raf = requestAnimationFrame(sync);
    rail.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      cancelAnimationFrame(raf);
      rail.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, [seasons]);

  /**
   * Peek nudge: on mobile/tablet, scroll slightly right then bounce back so the
   * user immediately understands the list is horizontally scrollable.
   */
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    // Only nudge when there is overflow and we are below the lg breakpoint.
    const nudgeIfNeeded = () => {
      if (window.innerWidth >= 1024) return;
      if (rail.scrollWidth <= rail.clientWidth) return;

      const t1 = setTimeout(() => {
        rail.scrollTo({ left: PEEK_PX, behavior: "smooth" });

        const t2 = setTimeout(() => {
          rail.scrollTo({ left: 0, behavior: "smooth" });
        }, PEEK_HOLD_MS);

        return () => clearTimeout(t2);
      }, PEEK_DELAY_MS);

      return () => clearTimeout(t1);
    };

    // Run after layout so scrollWidth is accurate.
    const raf = requestAnimationFrame(nudgeIfNeeded);
    return () => cancelAnimationFrame(raf);
  }, []);

  const page = useCallback((direction: 1 | -1) => {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollBy({
      left: direction * rail.clientWidth * 0.8,
      behavior: "smooth",
    });
  }, []);

  /**
   * Mouse-drag handler (pointer type "mouse" only).
   * Touch scrolling is handled natively via touch-pan-x on the rail.
   */
  const onPointerDown = (e: PointerEvent<HTMLUListElement>) => {
    if (e.pointerType === "touch" || !railRef.current) return;
    drag.current = {
      active: true,
      startX: e.clientX,
      startScroll: railRef.current.scrollLeft,
      moved: false,
    };
  };

  const onPointerMove = (e: PointerEvent<HTMLUListElement>) => {
    const rail = railRef.current;
    if (!rail || !drag.current.active) return;
    const dx = e.clientX - drag.current.startX;
    if (Math.abs(dx) > 4) drag.current.moved = true;
    rail.scrollLeft = drag.current.startScroll - dx;
  };

  const endDrag = () => {
    drag.current.active = false;
  };

  const onClickCapture = (e: React.MouseEvent<HTMLUListElement>) => {
    if (drag.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      drag.current.moved = false;
    }
  };

  const handlePrev = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    page(-1);
  };

  const handleNext = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    page(1);
  };

  return (
    <nav aria-label={t("heading")}>
      <h2 className="text-foreground mb-3 text-lg font-bold tracking-tight sm:text-xl">
        {t("heading")}
      </h2>

      {/*
       * Wrapper is strictly bounded to max-w-full with overflow-hidden on mobile/tablet
       * so the internal flex scroll rail cannot stretch the page layout width.
       * On lg+ desktop, overflow is visible to allow flex-wrap cards to flow naturally.
       */}
      <div className="relative w-full max-w-full overflow-hidden lg:overflow-visible">
        <ul
          ref={railRef}
          className="flex w-full cursor-grab touch-pan-x snap-x snap-proximity [scrollbar-width:none] gap-3 overflow-x-auto scroll-smooth py-1 select-none [-ms-overflow-style:none] active:cursor-grabbing lg:flex-wrap lg:overflow-visible [&::-webkit-scrollbar]:hidden"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
          onClickCapture={onClickCapture}
        >
          {seasons.map((season) => {
            const isActive = season.id === activeId;
            return (
              <li key={season.id} className="w-28 shrink-0 snap-start sm:w-32">
                <Link
                  // The hash carries the viewer down to the episode list on
                  // whichever page this points at — its own for the active
                  // card, the season's own detail page otherwise. The
                  // non-active href already carries the season suffix
                  // (`-season-2`, `-movie-1`, …) the canonical registry will
                  // claim for it, so the very first click lands on the same
                  // URL search engines will eventually index.
                  href={`${
                    season.isCurrent
                      ? basePath
                      : seasonAnimeHref(
                          season.id,
                          season.title,
                          season.kind,
                          season.index,
                        )
                  }#episodes`}
                  aria-current={isActive ? "true" : undefined}
                  className="group focus-visible:ring-ring block w-full outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                >
                  <div
                    className={cn(
                      "bg-surface relative aspect-[2/3] overflow-hidden border transition-colors",
                      isActive
                        ? "border-primary"
                        : "border-border group-hover:border-primary/60",
                    )}
                  >
                    {season.image ? (
                      <Image
                        src={season.image}
                        alt=""
                        fill
                        sizes="128px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="text-muted-foreground flex h-full w-full items-center justify-center">
                        <Film className="size-6" aria-hidden />
                      </div>
                    )}

                    {/* The marker the playing episode carries in the watch
                        list — the open season is the same kind of "you are
                        here", so it reads the same. */}
                    {isActive && <CurrentEpisodeBeam />}
                  </div>
                  <span
                    className={cn(
                      "mt-1.5 block text-xs font-semibold whitespace-nowrap",
                      isActive
                        ? "text-primary"
                        : "text-foreground group-hover:text-primary",
                    )}
                  >
                    {labelFor(season)}
                  </span>
                  {season.episodeCount !== null && (
                    <span className="text-muted-foreground block text-[11px] whitespace-nowrap">
                      {t("episodes", { count: season.episodeCount })}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Right-edge gradient fade — indicates more seasons to the right. */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-black/80 to-transparent transition-opacity duration-300 lg:hidden",
            canRight ? "opacity-100" : "opacity-0",
          )}
        />

        {/* Side navigation arrows for mobile/tablet slider (< lg) with pulse animation when more content exists */}
        <button
          type="button"
          aria-label={tHome("prev")}
          onClick={handlePrev}
          onPointerDown={(e) => e.stopPropagation()}
          className={cn(
            "group absolute inset-y-0 left-0 z-20 flex w-10 items-center justify-center bg-gradient-to-r from-black/80 via-black/40 to-transparent px-1 text-white/70 transition-all duration-200 hover:from-black/90 hover:text-white lg:hidden",
            canLeft ? "opacity-100" : "pointer-events-none opacity-0",
          )}
        >
          <ChevronLeft
            className="size-7 transition-transform duration-200 group-hover:scale-110"
            strokeWidth={2.5}
            aria-hidden
          />
        </button>

        <button
          type="button"
          aria-label={tHome("next")}
          onClick={handleNext}
          onPointerDown={(e) => e.stopPropagation()}
          className={cn(
            "group absolute inset-y-0 right-0 z-20 flex w-10 items-center justify-center bg-gradient-to-l from-black/80 via-black/40 to-transparent px-1 text-white/70 transition-all duration-200 hover:from-black/90 hover:text-white lg:hidden",
            canRight
              ? "animate-pulse opacity-100"
              : "pointer-events-none opacity-0",
          )}
        >
          <ChevronRight
            className="size-7 transition-transform duration-200 group-hover:scale-120"
            strokeWidth={3}
            aria-hidden
          />
        </button>
      </div>
    </nav>
  );
}
