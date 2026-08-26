import { ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

import {
  AnimePosterCard,
  AnimePosterCardSkeleton,
} from "@/components/anime/anime-poster-card";
import { AnimeCarousel } from "@/components/home/anime-carousel";
import { Link } from "@/i18n/navigation";
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

// Portrait (2:3) slides sized to match the Popular grid's poster cards, so the
// home rows and the Popular listing share one card footprint (~180–190px wide).
const cardWidthClass =
  "w-[40vw] shrink-0 snap-start sm:w-44 lg:w-48 xl:w-[11.75rem]";
// Static rail for the streaming skeleton (no drag/arrows), mirroring the
// carousel's spacing so streaming the real row in causes no layout shift.
const skeletonRailClass =
  "flex snap-x gap-4 overflow-x-auto py-4 sm:gap-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

/**
 * A titled, horizontally scrollable row of {@link AnimePosterCard}s (HOME-02..05).
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

  return (
    <section className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8">
      <div className="flex items-end justify-between">
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
            <AnimePosterCard anime={anime} priority={priority && index < 3} />
          </div>
        ))}
      </AnimeCarousel>
    </section>
  );
}

/** Streaming fallback for {@link AnimeRow}; mirrors its layout to avoid CLS. */
export function AnimeRowSkeleton() {
  return (
    <section className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8">
      <div>
        <div className="bg-surface h-6 w-40 animate-pulse" />
      </div>
      <div className={skeletonRailClass}>
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className={cardWidthClass}>
            <AnimePosterCardSkeleton />
          </div>
        ))}
      </div>
    </section>
  );
}
