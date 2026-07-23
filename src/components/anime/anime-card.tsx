import { Film, Play, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { animeHref } from "@/lib/anime/href";
import type { AnimeSummary } from "@/lib/anime/types";
import { cn } from "@/lib/utils";

interface AnimeCardProps {
  anime: AnimeSummary;
  /** Set on the first row's first cards so LCP art is not lazy-loaded. */
  priority?: boolean;
  /** Localized "Ep" prefix (e.g. from `home.card.episode`), only for recents. */
  episodeLabel?: string;
}

/**
 * 16:9 anime card (HOME-06). Pure server component — no client JS: the hover
 * animation (image zoom, flat dark scrim, detail reveal) is CSS-only via
 * `group-hover`, keeping the card in the server-rendered HTML for SEO.
 *
 * Design system: sharp corners, flat overlays (no gradient/glassmorphism),
 * Netflix-red accent, lucide icons — never emoji.
 */
export function AnimeCard({ anime, priority, episodeLabel }: AnimeCardProps) {
  const artwork = anime.banner ?? anime.image;
  const score = anime.rating !== null ? (anime.rating / 10).toFixed(1) : null;

  const meta = [
    anime.type,
    anime.releaseYear?.toString(),
    anime.episodeNumber !== null && episodeLabel
      ? `${episodeLabel} ${anime.episodeNumber}`
      : anime.totalEpisodes
        ? `${anime.totalEpisodes} ep`
        : null,
  ].filter(Boolean);

  return (
    <Link
      href={animeHref(anime.id, anime.title)}
      className="group focus-visible:ring-ring block w-full outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
    >
      <div
        className="border-border bg-surface group-hover:border-primary/60 relative aspect-video overflow-hidden border transition-[transform,border-color] duration-300 group-hover:z-10 group-hover:scale-[1.03] group-hover:shadow-[0_16px_40px_-12px_rgba(0,0,0,0.9)]"
        style={anime.color ? { backgroundColor: anime.color } : undefined}
      >
        {artwork ? (
          <Image
            src={artwork}
            alt={anime.title}
            fill
            priority={priority}
            sizes="(max-width: 640px) 60vw, (max-width: 1024px) 40vw, 300px"
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

        {/* Quick preview — flat scrim + details on hover (HOME-06). */}
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

      <h3
        className={cn(
          "mt-2 line-clamp-1 text-sm font-semibold transition-colors",
          "text-foreground group-hover:text-primary",
        )}
      >
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

/** Loading placeholder matching {@link AnimeCard}'s footprint (no CLS). */
export function AnimeCardSkeleton() {
  return (
    <div className="w-full">
      <div className="bg-surface border-border aspect-video w-full animate-pulse border" />
      <div className="bg-surface mt-2 h-4 w-4/5 animate-pulse" />
      <div className="bg-surface mt-1.5 h-3 w-2/5 animate-pulse" />
    </div>
  );
}
