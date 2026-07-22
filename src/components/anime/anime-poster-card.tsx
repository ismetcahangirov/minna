import { Film, Play, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import type { AnimeSummary } from "@/lib/anime/types";

interface AnimePosterCardProps {
  anime: AnimeSummary;
  /** Set on the first cards so above-the-fold art is not lazy-loaded. */
  priority?: boolean;
}

/**
 * Vertical (2:3 portrait) anime card used by the Popular and Favorites listings
 * (LIST-02/LIST-04). The 16:9 {@link import("./anime-card").AnimeCard} suits the
 * home rows; these infinite-scroll pages call for the taller poster format
 * (DESIGN-SPEC 3.3). Pure server component — the hover treatment (image zoom,
 * flat dark scrim, play affordance) is CSS-only via `group-hover`.
 *
 * Design system: sharp corners, flat overlays (no gradient/glassmorphism),
 * Netflix-red accent, lucide icons — never emoji.
 */
export function AnimePosterCard({ anime, priority }: AnimePosterCardProps) {
  const artwork = anime.image ?? anime.banner;
  const score = anime.rating !== null ? (anime.rating / 10).toFixed(1) : null;

  const meta = [
    anime.type,
    anime.releaseYear?.toString(),
    anime.totalEpisodes ? `${anime.totalEpisodes} ep` : null,
  ].filter(Boolean);

  return (
    <Link
      href={`/anime/${anime.id}`}
      className="group focus-visible:ring-ring block w-full outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
    >
      <div
        className="border-border bg-surface group-hover:border-primary/60 relative aspect-[2/3] overflow-hidden border transition-[transform,border-color] duration-300 group-hover:z-10 group-hover:scale-[1.03] group-hover:shadow-[0_16px_40px_-12px_rgba(0,0,0,0.9)]"
        style={anime.color ? { backgroundColor: anime.color } : undefined}
      >
        {artwork ? (
          <Image
            src={artwork}
            alt={anime.title}
            fill
            priority={priority}
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 220px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="text-muted-foreground flex h-full w-full items-center justify-center">
            <Film className="size-8" aria-hidden />
          </div>
        )}

        {/* Rating — always visible for scannability. */}
        {score && (
          <span className="bg-primary text-primary-foreground absolute top-0 left-0 inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-bold">
            <Star className="size-3 fill-current" aria-hidden />
            {score}
          </span>
        )}

        {/* Quick preview — flat scrim + details on hover. */}
        <div className="absolute inset-0 flex flex-col justify-end bg-black/70 p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <span className="bg-primary text-primary-foreground flex size-9 items-center justify-center self-start">
            <Play className="size-4 fill-current" aria-hidden />
          </span>
          {anime.genres.length > 0 && (
            <p className="text-muted-foreground mt-2 line-clamp-1 text-[11px] tracking-wide uppercase">
              {anime.genres.slice(0, 3).join(" · ")}
            </p>
          )}
        </div>
      </div>

      <h3 className="text-foreground group-hover:text-primary mt-2 line-clamp-2 text-sm font-semibold transition-colors">
        {anime.title}
      </h3>
      {meta.length > 0 && (
        <p className="text-muted-foreground mt-0.5 line-clamp-1 text-xs">
          {meta.join(" · ")}
        </p>
      )}
    </Link>
  );
}

/** Loading placeholder matching {@link AnimePosterCard}'s footprint (no CLS). */
export function AnimePosterCardSkeleton() {
  return (
    <div className="w-full">
      <div className="bg-surface border-border aspect-[2/3] w-full animate-pulse border" />
      <div className="bg-surface mt-2 h-4 w-4/5 animate-pulse" />
      <div className="bg-surface mt-1.5 h-3 w-2/5 animate-pulse" />
    </div>
  );
}
