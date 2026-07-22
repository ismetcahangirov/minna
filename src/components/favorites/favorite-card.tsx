import { Film, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import type { FavoriteItem } from "@/lib/favorites/types";

interface FavoriteCardProps {
  favorite: FavoriteItem;
  /** Set on the first cards so above-the-fold art is not lazy-loaded. */
  priority?: boolean;
}

/**
 * Vertical (2:3 portrait) card for the Favorites listing (LIST-04). Favorites
 * store only the denormalized `title`/`image`, so this is a lighter sibling of
 * {@link import("@/components/anime/anime-poster-card").AnimePosterCard} — same
 * visual language (sharp corners, flat hover scrim, Netflix-red accent), no
 * rating/meta. Links back to the anime detail page.
 */
export function FavoriteCard({ favorite, priority }: FavoriteCardProps) {
  return (
    <Link
      href={`/anime/${favorite.animeId}`}
      className="group focus-visible:ring-ring block w-full outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
    >
      <div className="border-border bg-surface group-hover:border-primary/60 relative aspect-[2/3] overflow-hidden border transition-[transform,border-color] duration-300 group-hover:z-10 group-hover:scale-[1.03] group-hover:shadow-[0_16px_40px_-12px_rgba(0,0,0,0.9)]">
        {favorite.image ? (
          <Image
            src={favorite.image}
            alt={favorite.title}
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

        <div className="absolute inset-0 flex items-end bg-black/70 p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <span className="bg-primary text-primary-foreground flex size-9 items-center justify-center">
            <Play className="size-4 fill-current" aria-hidden />
          </span>
        </div>
      </div>

      <h3 className="text-foreground group-hover:text-primary mt-2 line-clamp-2 text-sm font-semibold transition-colors">
        {favorite.title}
      </h3>
    </Link>
  );
}
