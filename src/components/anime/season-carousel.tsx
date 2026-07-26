"use client";

import { ChevronLeft, ChevronRight, Film } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  type PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { animeEpisodesHref } from "@/lib/anime/href";
import type { AnimeSeason } from "@/lib/anime/seasons";
import { cn } from "@/lib/utils";

interface SeasonCarouselProps {
  seasons: AnimeSeason[];
}

/**
 * Responsive season switcher (DETAIL-02). On mobile and tablet (< lg), renders
 * a horizontal slider rail with touch swipe, mouse drag, and side navigation
 * arrows matching the home page rows. On desktop (lg+), wraps neatly in a grid.
 */
export function SeasonCarousel({ seasons }: SeasonCarouselProps) {
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

  const page = useCallback((direction: 1 | -1) => {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollBy({
      left: direction * rail.clientWidth * 0.8,
      behavior: "smooth",
    });
  }, []);

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

      <div className="relative">
        <ul
          ref={railRef}
          className="flex cursor-grab touch-pan-y snap-x snap-proximity [scrollbar-width:none] gap-3 overflow-x-auto scroll-smooth py-1 select-none [-ms-overflow-style:none] active:cursor-grabbing lg:flex-wrap lg:overflow-visible [&::-webkit-scrollbar]:hidden"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
          onClickCapture={onClickCapture}
        >
          {seasons.map((season) => (
            <li key={season.id} className="w-28 shrink-0 snap-start sm:w-32">
              <Link
                href={animeEpisodesHref(season.id, season.title)}
                aria-current={season.isCurrent ? "page" : undefined}
                className="group focus-visible:ring-ring block w-full outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                <div
                  className={cn(
                    "bg-surface relative aspect-[2/3] overflow-hidden border transition-colors",
                    season.isCurrent
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
                </div>
                <span
                  className={cn(
                    "mt-1.5 block text-xs font-semibold whitespace-nowrap",
                    season.isCurrent
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
          ))}
        </ul>

        {/* Side navigation arrows for mobile/tablet slider (< lg) */}
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
            canRight ? "opacity-100" : "pointer-events-none opacity-0",
          )}
        >
          <ChevronRight
            className="size-7 transition-transform duration-200 group-hover:scale-110"
            strokeWidth={2.5}
            aria-hidden
          />
        </button>
      </div>
    </nav>
  );
}
