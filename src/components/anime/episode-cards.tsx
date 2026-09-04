import { ArrowDownUp, Check, Film, Play } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { EpisodePagination } from "@/components/anime/episode-pagination";
import { EpisodeSearch } from "@/components/anime/episode-search";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { episodeListHref, watchHref } from "@/lib/anime/href";
import type { AnimeEpisode } from "@/lib/anime/types";
import { cn } from "@/lib/utils";

/** Per-episode watched/resume state, keyed by episode id. */
type WatchState = { completed: boolean; progress: number };

interface EpisodeCardsProps {
  /**
   * The anime's canonical `{id}-{slug}` segment, resolved by the page.
   *
   * The episode links are built from this rather than from `animeTitle`:
   * the segment the proxy redirects to is whatever the slug registry holds,
   * and a list deriving its own sent every episode link through a 308.
   */
  animeSlug: string;
  /** Anime title — slugged into the readable watch URL. */
  animeTitle: string;
  /**
   * Path the sort, search and pagination controls point back at: the anime
   * detail page for the inline list, the episodes route for the standalone one.
   */
  basePath: string;
  /** Season id to keep in those links, when the list is not the page's own. */
  season?: string | null;
  /** The episodes of the current page only, already in display order. */
  episodes: AnimeEpisode[];
  /** Episodes in the whole series (the heading count, not the page's). */
  totalEpisodes: number;
  /** Episodes the current filter matches (equals `totalEpisodes` when idle). */
  matchCount: number;
  /** Active `?q=` search term, empty when the list is unfiltered. */
  query: string;
  /** Anime cover, used for episodes no source has a still for. */
  thumbnail: string | null;
  /** Signed-in viewer's watched/resume state per episode id (empty if none). */
  watchStates?: Record<string, WatchState>;
  /** 1-based page being rendered. */
  page: number;
  totalPages: number;
  /** Whether the list is sorted newest-first. */
  descending: boolean;
}

/**
 * Full-width, vertically stacked episode cards (openani-style), paginated on
 * the server: the route slices the episode list and this only renders the
 * current page, with the page and sort order carried in the URL
 * (`?page=3&order=desc`). That keeps every page crawlable and linkable, and
 * keeps a 1000-episode series from mounting a thousand rows.
 *
 * Design system: sharp corners, flat surfaces, red accent on hover, lucide
 * icons — never emoji.
 */
export async function EpisodeCards({
  animeSlug,
  animeTitle,
  basePath,
  season = null,
  episodes,
  totalEpisodes,
  matchCount,
  query,
  thumbnail,
  watchStates = {},
  page,
  totalPages,
  descending,
}: EpisodeCardsProps) {
  const t = await getTranslations("detail");

  if (totalEpisodes === 0) {
    return <p className="text-muted-foreground text-sm">{t("noEpisodes")}</p>;
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-foreground text-lg font-bold tracking-tight sm:text-xl">
            {t("episodesHeading", { title: animeTitle })}
            <span className="text-muted-foreground ml-2 text-sm font-normal">
              {query ? `${matchCount} / ${totalEpisodes}` : totalEpisodes}
            </span>
          </h2>
          {totalEpisodes > 1 && (
            // Sorting is a URL state like the page is, so the order survives a
            // reload and pagination always slices the list the viewer sees.
            <Link
              href={episodeListHref(basePath, {
                season,
                descending: !descending,
                query,
              })}
              scroll={false}
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            >
              <ArrowDownUp aria-hidden />
              {descending ? t("sortDesc") : t("sortAsc")}
            </Link>
          )}
        </div>
        {totalEpisodes > 1 && (
          <EpisodeSearch
            basePath={basePath}
            season={season}
            query={query}
            descending={descending}
          />
        )}
      </div>

      {episodes.length === 0 && (
        <p className="text-muted-foreground border-border bg-surface border p-4 text-sm">
          {t("search.empty", { query })}
        </p>
      )}

      <ul className="flex flex-col gap-3 empty:hidden">
        {episodes.map((episode) => {
          const state = watchStates[episode.id];
          const inProgress = state && !state.completed && state.progress > 0;
          // The episode's own still when a source has one; the anime art is
          // the stand-in, which is why every card used to look the same.
          const art = episode.image ?? thumbnail;
          return (
            <li key={episode.id}>
              <Link
                href={watchHref(animeSlug, episode.number)}
                className="group border-border bg-surface hover:border-primary/60 flex items-center gap-4 border p-3 transition-colors"
              >
                <div className="border-border bg-muted relative aspect-video w-32 shrink-0 overflow-hidden border sm:w-44">
                  {art ? (
                    <Image
                      src={art}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 128px, 176px"
                      className={
                        state?.completed
                          ? "object-cover opacity-40"
                          : "object-cover"
                      }
                    />
                  ) : (
                    <div className="text-muted-foreground flex h-full w-full items-center justify-center">
                      <Film className="size-6" aria-hidden />
                    </div>
                  )}

                  {/* Watched tick. */}
                  {state?.completed && (
                    <span
                      className="bg-primary text-primary-foreground absolute top-0 right-0 flex size-6 items-center justify-center"
                      title={t("watched")}
                    >
                      <Check className="size-4" aria-label={t("watched")} />
                    </span>
                  )}

                  {/* Resume progress bar. */}
                  {inProgress && (
                    <span className="absolute inset-x-0 bottom-0 h-1 bg-black/60">
                      <span
                        className="bg-primary block h-full"
                        style={{
                          width: `${Math.round(state.progress * 100)}%`,
                        }}
                      />
                    </span>
                  )}

                  <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                    <span className="bg-primary text-primary-foreground flex size-9 items-center justify-center">
                      <Play className="size-4 fill-current" aria-hidden />
                    </span>
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                    {t("episodeLabel", { number: episode.number })}
                  </span>
                  <h3 className="text-foreground group-hover:text-primary mt-0.5 line-clamp-1 text-sm font-semibold transition-colors sm:text-base">
                    {episode.title ??
                      t("episodeLabel", { number: episode.number })}
                  </h3>
                  {episode.description && (
                    <p className="text-muted-foreground mt-1 line-clamp-2 hidden text-xs sm:block">
                      {episode.description}
                    </p>
                  )}
                </div>

                <Play
                  className="text-muted-foreground group-hover:text-primary size-5 shrink-0 transition-colors"
                  aria-hidden
                />
              </Link>
            </li>
          );
        })}
      </ul>

      <EpisodePagination
        basePath={basePath}
        season={season}
        page={page}
        totalPages={totalPages}
        descending={descending}
        query={query}
      />
    </div>
  );
}
