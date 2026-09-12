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
import { canonicalAnimeHref, canonicalSlug } from "@/lib/anime/canonical-slug";
import {
  animeEpisodesHref,
  animeEpisodesPageHref,
  animeHref,
  episodesPageCount,
  parseAnimeParam,
  parseEpisodesPageParam,
  parseEpisodesQueryParam,
} from "@/lib/anime/href";
import { localeAlternates } from "@/lib/seo/locale-alternates";

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
 * Episodes list page (`/anime/[id]/episodes`). The detail page renders the
 * first page of this same list inline, and every other view of it — page two
 * onwards, newest-first, filtered — lives here: reading a search param makes a
 * route render per request, and the detail page is the one that had to stop
 * doing that (PERF-05). The sort, search and pagination controls under the
 * inline list therefore lead here.
 *
 * Deliberately still dynamic, and the only one of the three anime routes that
 * is. It reads `?page=`, `?order=` and `?q=`; caching a page per combination of
 * those would fill the cache with views nobody links to. It costs little: every
 * view of it canonicalises to the detail page, so search engines crawl that one
 * instead, and no session is read here any more — the watched ticks are read in
 * the browser, so a signed-out request decodes no session it does not have.
 *
 * Only the current page's episode titles are fetched (see
 * `@/lib/anime/episode-titles`).
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
  // Resolved once and reused for every path this page builds — its own
  // canonical URL, the redirects above it, and the episode links below. The
  // registry read is what those all agree on, so asking for it per href was
  // both several cache reads and a chance for them to disagree.
  const slug = await canonicalSlug(detail.id, detail.title);
  const canonicalPath = animeEpisodesHref(slug);
  if (`/anime/${id}/episodes` !== canonicalPath) {
    permanentRedirect({
      href: animeEpisodesPageHref(slug, null, {
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
      href: animeEpisodesPageHref(slug, null, { descending, query }),
      locale,
    });
  }
  const page = resolvePage(requested, totalPages);

  const t = await getTranslations("detail");
  const detailHref = animeHref(slug);

  const { slice, from, to } = pageSlice(matched, page, descending);
  const titles =
    !query && from > 0 ? await getEpisodeTitles(detail.id, from, to) : {};

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
          <SeasonSwitcher detail={detail} basePath={detailHref} />
          <AdBanner placement="episodes" />
          <section id="episodes">
            <EpisodeCards
              animeId={detail.id}
              animeSlug={slug}
              animeTitle={detail.title}
              basePath={canonicalPath}
              episodes={withEpisodeTitles(slice, titles)}
              totalEpisodes={detail.episodes.length}
              matchCount={matched.length}
              query={query ?? ""}
              thumbnail={detail.banner ?? detail.image}
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
