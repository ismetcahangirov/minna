import { Suspense } from "react";

import { SeasonCarousel } from "@/components/anime/season-carousel";
import { getAnimeSeasons } from "@/lib/anime/seasons";
import type { AnimeDetail } from "@/lib/anime/types";

interface SeasonSwitcherProps {
  detail: AnimeDetail;
  /** Page the cards select a season on (the canonical anime detail path). */
  basePath: string;
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
 * Resolves the season chain and renders the switcher (DETAIL-02): a responsive
 * slider on mobile and tablet (< lg), flex wrap on desktop (lg+). A title with
 * fewer than two related seasons stands alone and gets no rail at all — its
 * episodes are listed on the page regardless, so there is nothing to switch
 * between. Fetching is deferred behind {@link Suspense} so the slow relation
 * walk never blocks the first paint.
 */
async function SeasonTabsResolver({ detail, basePath }: SeasonSwitcherProps) {
  const seasons = await getAnimeSeasons(detail);
  if (seasons.length < 2) return null;

  // The card that is highlighted is always this page's own title: a card for
  // another season is a link to that season's own detail page, not a view of
  // this one.
  return (
    <SeasonCarousel
      seasons={seasons}
      basePath={basePath}
      activeId={detail.id}
    />
  );
}

/** Public entry: the streamed season switcher for the detail page. */
export function SeasonSwitcher(props: SeasonSwitcherProps) {
  return (
    <Suspense fallback={<SeasonTabsSkeleton />}>
      <SeasonTabsResolver {...props} />
    </Suspense>
  );
}
