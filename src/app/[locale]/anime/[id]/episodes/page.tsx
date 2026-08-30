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
import {
  isDescending,
  pageSlice,
  resolvePage,
} from "@/lib/anime/episode-listing";
import { filterEpisodes } from "@/lib/anime/episode-search";
import {
  getEpisodeTitles,
  getSeriesEpisodeTitles,
  withEpisodeTitles,
} from "@/lib/anime/episode-titles";
import {
  canonicalAnimeEpisodesHref,
  canonicalAnimeHref,
} from "@/lib/anime/canonical-slug";
import {
  animeEpisodesHref,
  episodesPageCount,
  parseAnimeParam,
  parseEpisodesPageParam,
  parseEpisodesQueryParam,
} from "@/lib/anime/href";
import { getCurrentUser } from "@/lib/auth/session";
import { localeAlternates } from "@/lib/seo/locale-alternates";
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
 * SEO metadata for the episodes list. Every view of this route — any page,
 * order or filter — canonicalises to the anime detail page, which renders the
 * same list inline under the season cards. That is where the list lives now and
 * where every internal link points, so pointing these URLs at it consolidates
 * the two onto one address instead of leaving Search Console to pick between a
 * page and its duplicate.
 */
export async function generateMetadata({
  params,
  searchParams,
}: EpisodesRouteProps): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const [{ id }, { page: pageParam }] = await Promise.all([
    params,
    searchParams,
  ]);
  const detail = await getAnimeInfo(parseAnimeParam(id));
  if (!detail) return { title: "Anime not found — Minna" };

  const totalPages = episodesPageCount(detail.episodes.length);
  const page = resolvePage(parseEpisodesPageParam(pageParam), totalPages);

  const title =
    page > 1
      ? `${detail.title} — Episodes — Page ${page} — Minna`
      : `${detail.title} — Episodes — Minna`;

  return {
    title,
    description: `Watch every episode of ${detail.title} on Minna.`,
    alternates: localeAlternates(
      await canonicalAnimeHref(detail.id, detail.title),
      locale,
    ),
  };
}

/**
 * Episodes list page (`/anime/[id]/episodes`). Nothing in the UI links here any
 * more — the same list is rendered inline on the detail page, under the season
 * cards — but the route is kept so its URLs, which search engines have indexed,
 * keep resolving.
 *
 * Server-rendered for SEO, including pagination: series longer than
 * `EPISODES_PAGE_SIZE` split into `?page=N` pages, and the sort order
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
  // episodes path, params preserved. The proxy issues that 308 before the
  // response starts (see `src/proxy.ts`); this is the standby for an id whose
  // slug nothing has claimed yet.
  const canonicalPath = await canonicalAnimeEpisodesHref(
    detail.id,
    detail.title,
  );
  if (`/anime/${id}/episodes` !== canonicalPath) {
    permanentRedirect({
      href: await canonicalAnimeEpisodesHref(detail.id, detail.title, {
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
      href: await canonicalAnimeEpisodesHref(detail.id, detail.title, {
        descending,
        query,
      }),
      locale,
    });
  }
  const page = resolvePage(requested, totalPages);

  const t = await getTranslations("detail");
  const user = await getCurrentUser();
  const detailHref = await canonicalAnimeHref(detail.id, detail.title);

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
          href={detailHref}
          className="text-muted-foreground hover:text-primary inline-flex items-center gap-1 text-sm font-medium transition-colors"
        >
          <ChevronLeft className="size-4" aria-hidden />
          {t("back")}
        </Link>

        <h1 className="text-foreground mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">
          {detail.title}
        </h1>

        <div className="mt-8 flex flex-col gap-10">
          <SeasonSwitcher
            detail={detail}
            basePath={detailHref}
            activeSeasonId={detail.id}
          />
          <AdBanner placement="episodes" />
          <section id="episodes">
            <EpisodeCards
              animeId={detail.id}
              animeTitle={detail.title}
              basePath={animeEpisodesHref(detail.id, detail.title)}
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
          </section>
        </div>
      </div>
    </main>
  );
}
