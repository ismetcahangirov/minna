import { ListVideo } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { SeasonCarousel } from "@/components/anime/season-carousel";
import { TapHint } from "@/components/anime/tap-hint";
import { Button } from "@/components/ui/button";
import { animeEpisodesHref } from "@/lib/anime/href";
import { getAnimeSeasons } from "@/lib/anime/seasons";
import type { AnimeDetail } from "@/lib/anime/types";

/**
 * Season switcher (DETAIL-02). Renders {@link SeasonCarousel} for a responsive
 * slider layout on mobile and tablet (< lg), and flex wrap on desktop (lg+).
 */
function SeasonTabs({
  seasons,
}: {
  seasons: Parameters<typeof SeasonCarousel>[0]["seasons"];
}) {
  return <SeasonCarousel seasons={seasons} />;
}

/** Fixed-height placeholder so streaming the tabs in causes minimal layout shift. */
function SeasonTabsSkeleton() {
  return (
    <div className="w-full">
      <div className="bg-surface mb-3 h-6 w-28 animate-pulse" />
      <div className="flex gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="w-28 shrink-0 sm:w-32">
            <div className="bg-surface aspect-[2/3] w-full animate-pulse border-transparent" />
            <div className="bg-surface mt-1.5 h-3 w-16 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Standalone-title fallback: when the anime has no related seasons the switcher
 * would leave an empty gap, so instead surface a button straight to this
 * title's episodes page. Rendered only when there are episodes to show.
 */
async function EpisodesLink({ detail }: { detail: AnimeDetail }) {
  const t = await getTranslations("detail.seasons");
  return (
    <Button
      size="lg"
      nativeButton={false}
      // `relative` gives the hint a box to sit in; the button keeps the width
      // it had before the hint existed.
      className="relative"
      render={<Link href={animeEpisodesHref(detail.id, detail.title)} />}
    >
      <span className="relative z-10 inline-flex items-center gap-1.5">
        <ListVideo aria-hidden className="relative z-10" />
        <span className="relative z-10">{t("viewEpisodes")}</span>
        {/* Hangs off the label's bottom-right corner and paints beneath it, so
            the tap reads as landing on the button without the hand ever
            covering the wording. Anchored to the label rather than the button,
            so it follows the text however wide the button gets. */}
        <TapHint className="text-primary-foreground/85 -right-7 -bottom-3" />
      </span>
    </Button>
  );
}

/** Resolves the season chain and renders the switcher. A title with fewer than
 * two related seasons stands alone, so it falls back to a direct episodes-page
 * button (or nothing when it has no episodes). Fetching is deferred behind
 * {@link Suspense} so the slow relation walk never blocks the first paint. */
async function SeasonTabsResolver({ detail }: { detail: AnimeDetail }) {
  const seasons = await getAnimeSeasons(detail);
  if (seasons.length >= 2) return <SeasonTabs seasons={seasons} />;
  if (detail.episodes.length === 0) return null;
  return <EpisodesLink detail={detail} />;
}

/** Public entry: the streamed season switcher for the detail page. */
export function SeasonSwitcher({ detail }: { detail: AnimeDetail }) {
  return (
    <Suspense fallback={<SeasonTabsSkeleton />}>
      <SeasonTabsResolver detail={detail} />
    </Suspense>
  );
}
