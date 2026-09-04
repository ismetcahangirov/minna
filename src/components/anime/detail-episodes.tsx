import { EpisodeCards } from "@/components/anime/episode-cards";
import { canonicalSlug } from "@/lib/anime/canonical-slug";
import { getAnimeInfo } from "@/lib/anime/detail";
import { filterEpisodes } from "@/lib/anime/episode-search";
import { pageSlice, resolvePage } from "@/lib/anime/episode-listing";
import {
  getEpisodeTitles,
  getSeriesEpisodeTitles,
  withEpisodeTitles,
} from "@/lib/anime/episode-titles";
import { episodesPageCount } from "@/lib/anime/href";
import { getAnimeSeasons } from "@/lib/anime/seasons";
import type { AnimeDetail } from "@/lib/anime/types";
import { getCurrentUser } from "@/lib/auth/session";
import { getAnimeWatchStates } from "@/lib/watch/queries";

interface DetailEpisodesProps {
  /** The title whose detail page this is. */
  detail: AnimeDetail;
  /** Canonical detail path — where the list's own controls link back to. */
  basePath: string;
  /** Requested `?season=`, still unverified against this title's chain. */
  season: string | null;
  /** Requested `?page=`, or null when the value was junk. */
  page: number | null;
  descending: boolean;
  query: string | null;
}

/**
 * The title whose episodes the list shows: the season the viewer picked from
 * the rail, or this page's own title. A `?season=` outside this title's chain
 * is ignored rather than fetched, so the param cannot be used to list an
 * arbitrary anime under someone else's page; a season that cannot be resolved
 * degrades to the same fallback.
 */
async function activeTitle(
  detail: AnimeDetail,
  season: string | null,
): Promise<AnimeDetail> {
  if (!season || season === detail.id) return detail;

  const seasons = await getAnimeSeasons(detail);
  if (!seasons.some((entry) => entry.id === season)) return detail;

  return (await getAnimeInfo(season)) ?? detail;
}

/**
 * The episode list rendered inline on the detail page, under the season cards
 * (DETAIL-02). Same list the `/anime/[id]/episodes` route renders — same page
 * size, ordering, search and pagination — except its controls stay on this
 * page, carrying the open season in `?season=`.
 */
export async function DetailEpisodes({
  detail,
  basePath,
  season,
  page: requestedPage,
  descending,
  query,
}: DetailEpisodesProps) {
  const active = await activeTitle(detail, season);
  // Only a season other than this page's own needs to stay in the URL.
  const seasonParam = active.id === detail.id ? null : active.id;

  // Searching spans the whole series, so it needs every title up front; plain
  // browsing only pays for the page it renders (further down).
  const seriesTitles = query
    ? await getSeriesEpisodeTitles(active.id, active.episodes.length)
    : {};
  const matched = filterEpisodes(
    query ? withEpisodeTitles(active.episodes, seriesTitles) : active.episodes,
    query,
  );

  const totalPages = episodesPageCount(matched.length);
  const page = resolvePage(requestedPage, totalPages);

  const user = await getCurrentUser();
  const { slice, from, to } = pageSlice(matched, page, descending);
  const [watchStates, titles] = await Promise.all([
    user?.id ? getAnimeWatchStates(user.id, active.id) : Promise.resolve({}),
    !query && from > 0
      ? getEpisodeTitles(active.id, from, to)
      : Promise.resolve({}),
  ]);

  return (
    <EpisodeCards
      animeSlug={await canonicalSlug(active.id, active.title)}
      animeTitle={active.title}
      basePath={basePath}
      season={seasonParam}
      episodes={withEpisodeTitles(slice, titles)}
      totalEpisodes={active.episodes.length}
      matchCount={matched.length}
      query={query ?? ""}
      thumbnail={active.banner ?? active.image}
      watchStates={watchStates}
      page={page}
      totalPages={totalPages}
      descending={descending}
    />
  );
}

/** Placeholder while the list streams in, sized like the cards it replaces. */
export function DetailEpisodesSkeleton() {
  return (
    <div className="w-full">
      <div className="bg-surface mb-4 h-7 w-32 animate-pulse" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="border-border bg-surface flex items-center gap-4 border p-3"
          >
            <div className="bg-muted aspect-video w-32 shrink-0 animate-pulse sm:w-44" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="bg-muted h-3 w-20 animate-pulse" />
              <div className="bg-muted h-4 w-2/3 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
