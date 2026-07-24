"use client";

import { Info, Play, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { animeHref } from "@/lib/anime/href";
import type { AnimeSummary } from "@/lib/anime/types";
import { cn } from "@/lib/utils";
import { useGetAnimeSectionQuery } from "@/store/api/anime-api";

const ROTATE_MS = 7000;
const MAX_SLIDES = 5;

/** AniList descriptions carry inline HTML (`<br>`, `<i>`); render as plain text. */
function stripHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Featured hero (HOME-01). Auto-rotating banner over the top trending titles.
 *
 * Data model for HOME-07: `initialItems` is fetched server-side (SSR) so the
 * first slide ships in the HTML for LCP/SEO, while `useGetAnimeSectionQuery`
 * (RTK Query → `/api/anime/trending` → Redis → Consumet) drives the client
 * list and refetch-on-focus. Legibility uses flat black layers — no gradient,
 * no glassmorphism (design system).
 */
export function HeroCarousel({
  initialItems,
}: {
  initialItems: AnimeSummary[];
}) {
  const t = useTranslations("home.hero");
  const { data } = useGetAnimeSectionQuery("trending");

  const slides = (data && data.length > 0 ? data : initialItems).slice(
    0,
    MAX_SLIDES,
  );

  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const heroRef = useRef<HTMLElement>(null);

  // On first load the tall hero (min-h 96/123vh) pushes its content below the
  // fold, so nudge the page down until the hero's bottom (where the title and
  // actions sit) reaches the viewport bottom. Instant, mount-only.
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const heroBottom =
      el.getBoundingClientRect().top + window.scrollY + el.offsetHeight;
    window.scrollTo({
      top: Math.max(0, heroBottom - window.innerHeight),
      behavior: "auto",
    });
  }, []);

  // Clamp during render (not via an effect) so the index stays valid if the
  // slide list shrinks after a refetch. The interval self-corrects via modulo.
  const activeIndex = active < slides.length ? active : 0;

  useEffect(() => {
    if (slides.length <= 1 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = window.setInterval(
      () => setActive((current) => (current + 1) % slides.length),
      ROTATE_MS,
    );
    return () => window.clearInterval(timer);
  }, [slides.length, paused]);

  if (slides.length === 0) return null;

  return (
    <section
      ref={heroRef}
      aria-roledescription="carousel"
      aria-label={t("carouselLabel")}
      className="relative min-h-[96vh] w-full overflow-hidden bg-black lg:min-h-[123vh]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {slides.map((anime, index) => {
        const artwork = anime.banner ?? anime.image;
        const isActive = index === activeIndex;
        const score =
          anime.rating !== null ? (anime.rating / 10).toFixed(1) : null;

        return (
          <div
            key={anime.id}
            inert={!isActive}
            className={cn(
              "absolute inset-0 transition-opacity duration-700",
              isActive ? "opacity-100" : "opacity-0",
            )}
          >
            {artwork && (
              <Image
                src={artwork}
                alt=""
                fill
                priority={index === 0}
                quality={90}
                sizes="100vw"
                className="object-cover object-top"
              />
            )}
            {/* Legibility scrim + seam — matched to the detail hero: a scrim
                that ramps gradually to solid black at the bottom, plus a soft
                shadow seam where the hero meets the sections below. */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[72%] bg-[linear-gradient(to_top,#000_0%,rgba(0,0,0,0.82)_32%,rgba(0,0,0,0.35)_62%,transparent_100%)]" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-px shadow-[0_-1px_28px_10px_rgba(0,0,0,0.85),0_1px_0_0_rgba(255,255,255,0.06)]" />

            <div className="relative flex h-full flex-col justify-end">
              <div className="mx-auto w-full max-w-[1600px] px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20">
                <div className="max-w-2xl">
                  {anime.genres.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {anime.genres.slice(0, 3).map((genre) => (
                        <span
                          key={genre}
                          className="border-border/80 text-foreground/90 border px-2 py-0.5 text-[11px] font-medium tracking-wide uppercase"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  )}

                  <h1 className="text-foreground text-3xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                    {anime.title}
                  </h1>

                  <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    {score && (
                      <span className="text-foreground inline-flex items-center gap-1 font-semibold">
                        <Star
                          className="text-primary size-4 fill-current"
                          aria-hidden
                        />
                        {score}
                      </span>
                    )}
                    {anime.releaseYear && <span>{anime.releaseYear}</span>}
                    {anime.type && <span>{anime.type}</span>}
                    {anime.totalEpisodes && (
                      <span>{anime.totalEpisodes} ep</span>
                    )}
                  </div>

                  {anime.description && (
                    <p className="text-muted-foreground mt-4 hidden max-w-xl text-sm leading-relaxed sm:line-clamp-3">
                      {stripHtml(anime.description)}
                    </p>
                  )}

                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button
                      size="lg"
                      nativeButton={false}
                      render={<Link href={animeHref(anime.id, anime.title)} />}
                    >
                      <Play className="fill-current" aria-hidden />
                      {t("watchNow")}
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      nativeButton={false}
                      render={<Link href={animeHref(anime.id, anime.title)} />}
                    >
                      <Info aria-hidden />
                      {t("moreInfo")}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {slides.length > 1 && (
        <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 gap-2 sm:right-8 sm:left-auto sm:translate-x-0">
          {slides.map((anime, index) => (
            <button
              key={anime.id}
              type="button"
              aria-label={t("goToSlide", { index: index + 1 })}
              aria-current={index === activeIndex}
              onClick={() => setActive(index)}
              className={cn(
                "h-1.5 w-6 transition-colors",
                index === activeIndex
                  ? "bg-primary"
                  : "bg-white/40 hover:bg-white/70",
              )}
            />
          ))}
        </div>
      )}
    </section>
  );
}
