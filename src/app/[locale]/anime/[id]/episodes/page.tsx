import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { EpisodeCards } from "@/components/anime/episode-cards";
import { AdBanner } from "@/components/home/ad-banner";
import { SeasonSwitcher } from "@/components/anime/season-tabs";
import { Link, permanentRedirect, redirect } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/route-locale";
import { getAnimeInfo } from "@/lib/anime/detail";
import { filterEpisodes } from "@/lib/anime/episode-search";
import {
  getEpisodeTitles,
  getSeriesEpisodeTitles,
  withEpisodeTitles,
} from "@/lib/anime/episode-titles";
import {
  EPISODES_PAGE_SIZE,
  animeEpisodesHref,
  animeEpisodesPageHref,
  animeHref,
  episodesPageCount,
  parseAnimeParam,
  parseEpisodesPageParam,
  parseEpisodesQueryParam,
} from "@/lib/anime/href";
import { getCurrentUser } from "@/lib/auth/session";
import type { AnimeEpisode } from "@/lib/anime/types";
import { getAnimeWatchStates } from "@/lib/watch/queries";

interface EpisodesRouteProps {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{
    page?: string | string[];
    order?: string | string[];
    q?: string | string[];
  }>;
}

/**
 * The page actually rendered for a requested page number: the first page when
 * the request is invalid (`null`) or points past the end, matching the redirect
 * the route issues for those URLs so the canonical tag never disagrees with it.
 */
function resolvePage(requested: number | null, totalPages: number): number {
  if (requested === null || requested < 1 || requested > totalPages) return 1;
  return requested;
}

/** True when the `?order=` param asks for the newest-first listing. */
function isDescending(order: string | string[] | undefined): boolean {
  return order === "desc";
}

/**
 * The episodes rendered on `page`, in display order, together with the range of
 * episode numbers they cover (used to fetch just that window's titles).
 */
function pageSlice(
  episodes: AnimeEpisode[],
  page: number,
  descending: boolean,
): { slice: AnimeEpisode[]; from: number; to: number } {
  const ordered = [...episodes].sort((a, b) => a.number - b.number);
  if (descending) ordered.reverse();

  const start = (page - 1) * EPISODES_PAGE_SIZE;
  const slice = ordered.slice(start, start + EPISODES_PAGE_SIZE);
  const numbers = slice.map((episode) => episode.number);

  return {
    slice,
    from: numbers.length ? Math.min(...numbers) : 0,
    to: numbers.length ? Math.max(...numbers) : 0,
  };
}

/**
 * SEO metadata for the episodes list. Each page self-canonicalises to its own
 * `?page=` URL so paginated pages are indexed as distinct pages rather than
 * duplicates of the first; the reversed listing is the same content in another
 * order, so it is marked `noindex, follow` instead.
 */
export async function generateMetadata({
  params,
  searchParams,
}: EpisodesRouteProps): Promise<Metadata> {
  const [{ id }, { page: pageParam, order, q }] = await Promise.all([
    params,
    searchParams,
  ]);
  const detail = await getAnimeInfo(parseAnimeParam(id));
  if (!detail) return { title: "Anime not found — Minna" };

  const descending = isDescending(order);
  const query = parseEpisodesQueryParam(q);
  const totalPages = episodesPageCount(detail.episodes.length);
  const page = resolvePage(parseEpisodesPageParam(pageParam), totalPages);

  const description = `Watch every episode of ${detail.title} on Minna.`;

  // A filtered list is a view of the full one, not a page of its own: point it
  // at the unfiltered list and keep it out of the index.
  if (query) {
    return {
      title: `${detail.title} — Episodes — Minna`,
      description,
      alternates: {
        canonical: animeEpisodesPageHref(detail.id, detail.title),
      },
      robots: { index: false, follow: true },
    };
  }

  const title =
    page > 1
      ? `${detail.title} — Episodes — Page ${page} — Minna`
      : `${detail.title} — Episodes — Minna`;

  return {
    title,
    description,
    alternates: {
      canonical: animeEpisodesPageHref(detail.id, detail.title, { page }),
    },
    ...(descending ? { robots: { index: false, follow: true } } : {}),
  };
}

/**
 * Episodes list page (`/anime/[id]/episodes`). Reached from a season poster
 * card or the detail page's watch button.
 *
 * Server-rendered for SEO, including pagination: series longer than
 * {@link EPISODES_PAGE_SIZE} split into `?page=N` pages, and the sort order
 * rides along as `?order=desc`, so every view has its own crawlable URL. Only
 * the current page's episode titles are fetched (see `@/lib/anime/episode-titles`).
 */
export default async function AnimeEpisodesPage({
  params,
  searchParams,
}: EpisodesRouteProps) {
  const [{ id }, { page: pageParam, order, q }] = await Promise.all([
    params,
    searchParams,
  ]);
  const locale = await resolveLocale(params);
  const detail = await getAnimeInfo(parseAnimeParam(id));
  if (!detail) notFound();

  const descending = isDescending(order);
  const query = parseEpisodesQueryParam(q);

  // Keep SEO on one canonical URL: a bare id or stale slug 308s to the slugged
  // episodes path, params preserved.
  const canonicalPath = animeEpisodesHref(detail.id, detail.title);
  if (`/anime/${id}/episodes` !== canonicalPath) {
    permanentRedirect({
      href: animeEpisodesPageHref(detail.id, detail.title, {
        page: parseEpisodesPageParam(pageParam) ?? 1,
        descending,
        query,
      }),
      locale,
    });
  }

  // Searching spans the whole series, so it needs every title up front; plain
  // browsing only pays for the page it renders (further down).
  const seriesTitles = query
    ? await getSeriesEpisodeTitles(detail.id, detail.episodes.length)
    : {};
  const matched = filterEpisodes(
    query ? withEpisodeTitles(detail.episodes, seriesTitles) : detail.episodes,
    query,
  );

  const totalPages = episodesPageCount(matched.length);
  const requested = parseEpisodesPageParam(pageParam);

  // `?page=1`, a junk value or a page past the end all render the first page —
  // send them there instead of serving that content under a second URL.
  if (
    pageParam !== undefined &&
    (requested === null || requested === 1 || requested > totalPages)
  ) {
    redirect({
      href: animeEpisodesPageHref(detail.id, detail.title, {
        descending,
        query,
      }),
      locale,
    });
  }
  const page = resolvePage(requested, totalPages);

  const t = await getTranslations("detail");
  const user = await getCurrentUser();

  const { slice, from, to } = pageSlice(matched, page, descending);
  const [watchStates, titles] = await Promise.all([
    user?.id ? getAnimeWatchStates(user.id, detail.id) : Promise.resolve({}),
    !query && from > 0
      ? getEpisodeTitles(detail.id, from, to)
      : Promise.resolve({}),
  ]);

  return (
    <main className="flex flex-1 flex-col pb-10">
      {/* pt clears the fixed 4rem header, which the back link sat behind. */}
      <div className="mx-auto w-full max-w-[1600px] px-4 pt-24 pb-8 sm:px-6 lg:px-8">
        <Link
          href={animeHref(detail.id, detail.title)}
          className="text-muted-foreground hover:text-primary inline-flex items-center gap-1 text-sm font-medium transition-colors"
        >
          <ChevronLeft className="size-4" aria-hidden />
          {t("back")}
        </Link>

        <h1 className="text-foreground mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">
          {detail.title}
        </h1>

        <div className="mt-8 flex flex-col gap-10">
          <SeasonSwitcher detail={detail} />
          <AdBanner />
          <EpisodeCards
            animeId={detail.id}
            animeTitle={detail.title}
            episodes={withEpisodeTitles(slice, titles)}
            totalEpisodes={detail.episodes.length}
            matchCount={matched.length}
            query={query ?? ""}
            thumbnail={detail.banner ?? detail.image}
            watchStates={watchStates}
            page={page}
            totalPages={totalPages}
            descending={descending}
          />
        </div>
      </div>
    </main>
  );
}
