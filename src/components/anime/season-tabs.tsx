import { Film } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { animeEpisodesHref } from "@/lib/anime/href";
import { type AnimeSeason, getAnimeSeasons } from "@/lib/anime/seasons";
import type { AnimeDetail } from "@/lib/anime/types";
import { cn } from "@/lib/utils";

/**
 * Season switcher (DETAIL-02). A horizontal strip of season poster cards, the
 * current one accented. Each card is a plain `<Link>` to that season's episodes
 * page — navigation, not client state — so the whole thing is server-rendered
 * HTML, good for SEO and the internal link graph.
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
      <ul className="flex [scrollbar-width:none] gap-3 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
        {seasons.map((season) => (
          <li key={season.id} className="shrink-0">
            <Link
              href={animeEpisodesHref(season.id, season.title)}
              aria-current={season.isCurrent ? "page" : undefined}
              className="group focus-visible:ring-ring block w-28 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:w-32"
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
    </nav>
  );
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
