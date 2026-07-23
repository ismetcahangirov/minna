import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { animeHref } from "@/lib/anime/href";
import { type AnimeSeason, getAnimeSeasons } from "@/lib/anime/seasons";
import type { AnimeDetail } from "@/lib/anime/types";
import { cn } from "@/lib/utils";

/**
 * Season switcher (DETAIL-02). A horizontal strip of season tabs, the current
 * one active. Each tab is a plain `<Link>` to that season's own detail page —
 * navigation, not client state — so the whole thing is server-rendered HTML,
 * good for SEO and the internal link graph.
 *
 * Design system: black base, flat surfaces (no gradient/glassmorphism), sharp
 * corners, Netflix-red accent for the active tab.
 */
async function SeasonTabs({ seasons }: { seasons: AnimeSeason[] }) {
  const t = await getTranslations("detail.seasons");

  // Only number a repeating non-season kind (Movie 1/2…); a lone movie is just
  // "Movie". Seasons are always numbered.
  const counts = seasons.reduce<Record<string, number>>((acc, s) => {
    acc[s.kind] = (acc[s.kind] ?? 0) + 1;
    return acc;
  }, {});

  function labelFor(season: AnimeSeason): string {
    if (season.kind === "season") return t("season", { number: season.index });
    const word = t(season.kind);
    return counts[season.kind] > 1 ? `${word} ${season.index}` : word;
  }

  return (
    <nav aria-label={t("heading")}>
      <h2 className="text-foreground mb-3 text-lg font-bold tracking-tight sm:text-xl">
        {t("heading")}
      </h2>
      <ul className="flex gap-2 overflow-x-auto pb-1">
        {seasons.map((season) => (
          <li key={season.id} className="shrink-0">
            <Link
              href={animeHref(season.id, season.title)}
              aria-current={season.isCurrent ? "page" : undefined}
              className={cn(
                "focus-visible:ring-ring flex min-w-max flex-col border px-3 py-2 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
                season.isCurrent
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-surface text-foreground hover:border-primary/60",
              )}
            >
              <span className="text-sm font-semibold whitespace-nowrap">
                {labelFor(season)}
              </span>
              {season.episodeCount !== null && (
                <span className="text-xs whitespace-nowrap opacity-80">
                  {t("episodes", { count: season.episodeCount })}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Fixed-height placeholder so streaming the tabs in causes minimal layout shift. */
function SeasonTabsSkeleton() {
  return (
    <div className="h-[68px] w-full">
      <div className="bg-surface mb-3 h-6 w-28 animate-pulse" />
      <div className="flex gap-2">
        <div className="bg-surface h-[42px] w-24 animate-pulse" />
        <div className="bg-surface h-[42px] w-24 animate-pulse" />
      </div>
    </div>
  );
}

/** Resolves the season chain and renders the switcher, or nothing when the
 * title stands alone. Fetching is deferred behind {@link Suspense} so the slow
 * relation walk never blocks the detail page's first paint. */
async function SeasonTabsResolver({ detail }: { detail: AnimeDetail }) {
  const seasons = await getAnimeSeasons(detail);
  if (seasons.length < 2) return null;
  return <SeasonTabs seasons={seasons} />;
}

/** Public entry: the streamed season switcher for the detail page. */
export function SeasonSwitcher({ detail }: { detail: AnimeDetail }) {
  return (
    <Suspense fallback={<SeasonTabsSkeleton />}>
      <SeasonTabsResolver detail={detail} />
    </Suspense>
  );
}
