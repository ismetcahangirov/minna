import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { AnimeCard, AnimeCardSkeleton } from "@/components/anime/anime-card";
import { AnimeCarousel } from "@/components/home/anime-carousel";
import { getAnimeSection } from "@/lib/anime/catalog";
import type { AnimeSection } from "@/lib/anime/types";

/** Keys under the `home.sections` message namespace. */
type SectionTitleKey = "latest" | "popular" | "topRated" | "trending";

interface AnimeRowProps {
  section: AnimeSection;
  titleKey: SectionTitleKey;
  /** Optional "see all" target when a dedicated listing page exists. */
  seeAllHref?: string;
  /** First visible row — eager-loads its leading artwork for LCP. */
  priority?: boolean;
}

// Carousel slides sit ~30% wider than the old rail cards; paired with the
// {@link AnimeCard} `wide` (2:1) ratio this lands them ~15% taller too.
const cardWidthClass =
  "w-[82vw] shrink-0 snap-start sm:w-72 lg:w-[21rem] xl:w-[23rem]";
// Static rail for the streaming skeleton (no drag/arrows), mirroring the
// carousel's spacing so streaming the real row in causes no layout shift.
const skeletonRailClass =
  "flex snap-x gap-4 overflow-x-auto px-4 py-4 sm:gap-5 sm:px-6 lg:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

/**
 * A titled, horizontally scrollable row of {@link AnimeCard}s (HOME-02..05).
 * Async server component: fetches its own Redis-cached section (SSR) so each
 * row streams independently when wrapped in `<Suspense>`. Renders nothing when
 * the section is empty (e.g. Consumet unavailable) rather than an empty rail.
 */
export async function AnimeRow({
  section,
  titleKey,
  seeAllHref,
  priority,
}: AnimeRowProps) {
  const items = await getAnimeSection(section);
  if (items.length === 0) return null;

  const t = await getTranslations("home");
  const episodeLabel = t("card.episode");

  return (
    <section className="mx-auto w-full max-w-[1600px]">
      <div className="flex items-end justify-between px-4 sm:px-6 lg:px-8">
        <h2 className="text-foreground text-lg font-bold tracking-tight sm:text-xl">
          {t(`sections.${titleKey}`)}
        </h2>
        {seeAllHref && (
          <Link
            href={seeAllHref}
            className="text-muted-foreground hover:text-primary inline-flex items-center gap-0.5 text-sm font-medium transition-colors"
          >
            {t("seeAll")}
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        )}
      </div>

      <AnimeCarousel
        prevLabel={t("carousel.prev")}
        nextLabel={t("carousel.next")}
      >
        {items.map((anime, index) => (
          <div key={`${anime.id}-${index}`} className={cardWidthClass}>
            <AnimeCard
              anime={anime}
              episodeLabel={episodeLabel}
              wide
              priority={priority && index < 3}
            />
          </div>
        ))}
      </AnimeCarousel>
    </section>
  );
}

/** Streaming fallback for {@link AnimeRow}; mirrors its layout to avoid CLS. */
export function AnimeRowSkeleton() {
  return (
    <section className="mx-auto w-full max-w-[1600px]">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="bg-surface h-6 w-40 animate-pulse" />
      </div>
      <div className={skeletonRailClass}>
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className={cardWidthClass}>
            <AnimeCardSkeleton wide />
          </div>
        ))}
      </div>
    </section>
  );
}
