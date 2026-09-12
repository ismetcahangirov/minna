import { EpisodeCards } from "@/components/anime/episode-cards";
import { canonicalSlug } from "@/lib/anime/canonical-slug";
import { pageSlice } from "@/lib/anime/episode-listing";
import {
  getEpisodeTitles,
  withEpisodeTitles,
} from "@/lib/anime/episode-titles";
import { episodesPageCount } from "@/lib/anime/href";
import type { AnimeDetail } from "@/lib/anime/types";

interface DetailEpisodesProps {
  /** The title whose detail page this is. */
  detail: AnimeDetail;
  /** Where the list's sort, search and pagination controls lead. */
  episodesPath: string;
}

/**
 * The episode list rendered inline on the detail page, under the season cards
 * (DETAIL-02): the first page of this title's episodes, oldest first,
 * unfiltered.
 *
 * Only that one view, on purpose. The list used to read `?season=`, `?page=`,
 * `?order=` and `?q=` from the detail page's own URL, and reading a search
 * param anywhere in a page makes the whole route render per request — which on
 * the largest crawl surface of the site (one page per title, all of them in the
 * sitemap) is most of what the Fluid Active CPU allowance was spent on
 * (PERF-05). Every other view of the list lives on `/anime/[id]/episodes`,
 * which stays dynamic and which these controls link to; that route canonicalises
 * back here, so the episode titles search engines index are still the ones on
 * this page.
 *
 * `?season=` is gone entirely rather than moved: every season card already
 * links to that season's own detail page, so nothing had produced the param
 * since the season rail was rebuilt.
 */
export async function DetailEpisodes({
  detail,
  episodesPath,
}: DetailEpisodesProps) {
  const totalPages = episodesPageCount(detail.episodes.length);
  const { slice, from, to } = pageSlice(detail.episodes, 1, false);
  const titles = from > 0 ? await getEpisodeTitles(detail.id, from, to) : {};

  return (
    <EpisodeCards
      animeId={detail.id}
      animeSlug={await canonicalSlug(detail.id, detail.title)}
      animeTitle={detail.title}
      basePath={episodesPath}
      episodes={withEpisodeTitles(slice, titles)}
      totalEpisodes={detail.episodes.length}
      matchCount={detail.episodes.length}
      query=""
      thumbnail={detail.banner ?? detail.image}
      page={1}
      totalPages={totalPages}
      descending={false}
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
