import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { EpisodeList } from "@/components/anime/episode-list";
import { WatchEpisodeList } from "@/components/anime/watch-episode-list";
import { AdBanner } from "@/components/home/ad-banner";
import { EpisodeReviews } from "@/components/community/episode-reviews";
import { WatchEpisodeLabel } from "@/components/watch/watch-episode-label";
import { WatchExperience } from "@/components/watch/watch-experience";
import { permanentRedirect } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/route-locale";
import { getActivePreRollAd } from "@/lib/ads/queries";
import { getAnimeInfo } from "@/lib/anime/detail";
import { canonicalSlug, canonicalWatchHref } from "@/lib/anime/canonical-slug";
import {
  parseAnimeParam,
  parseEpisodeNumber,
  watchHref,
} from "@/lib/anime/href";
import { stripHtml } from "@/lib/anime/text";
import type { AnimeEpisode } from "@/lib/anime/types";
import { getCurrentUser } from "@/lib/auth/session";
import {
  localeAlternates,
  openGraphLocaleSet,
} from "@/lib/seo/locale-alternates";
import { getWatchProgress } from "@/lib/watch/queries";

interface WatchRouteProps {
  params: Promise<{ locale: string; animeId: string; episodeId: string }>;
}

/**
 * Resolves the current episode plus its ordered neighbours from the anime's
 * episode list. When the list is empty (Consumet origin down) a synthetic
 * episode keeps the route renderable so the player can show its unavailable
 * state; when the list exists but the id is unknown the caller 404s.
 */
function locateEpisode(
  episodes: AnimeEpisode[],
  episodeId: string,
): {
  current: AnimeEpisode;
  prev: AnimeEpisode | null;
  next: AnimeEpisode | null;
  known: boolean;
} | null {
  const ordered = [...episodes].sort((a, b) => a.number - b.number);

  // Prefer the readable `episode-{n}` slug; fall back to a legacy opaque id so
  // old bookmarks and denormalized ids keep resolving (they then 308 to the
  // canonical slug form below).
  const number = parseEpisodeNumber(episodeId);
  let index =
    number != null
      ? ordered.findIndex((episode) => episode.number === number)
      : -1;
  if (index === -1) {
    index = ordered.findIndex((episode) => episode.id === episodeId);
  }

  if (index === -1) {
    if (ordered.length > 0) return null; // id not part of this anime → 404
    return {
      current: {
        id: episodeId,
        number: 1,
        title: null,
        description: null,
        airDate: null,
        image: null,
      },
      prev: null,
      next: null,
      known: false,
    };
  }

  return {
    current: ordered[index],
    prev: index > 0 ? ordered[index - 1] : null,
    next: index < ordered.length - 1 ? ordered[index + 1] : null,
    known: true,
  };
}

/**
 * Dynamic SEO metadata for the watch page: anime title + episode number, an
 * episode-aware description and Open Graph video card. Shares `getAnimeInfo`'s
 * per-request cache with the page component, so it adds no extra fetch.
 */
export async function generateMetadata({
  params,
}: WatchRouteProps): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const { animeId, episodeId } = await params;
  const detail = await getAnimeInfo(parseAnimeParam(animeId));

  if (!detail) return { title: "Episode not found — Minna" };

  const located = locateEpisode(detail.episodes, episodeId);
  const number = located?.current.number ?? 1;
  const title = `${detail.title} — Episode ${number} — Minna`;
  const description = detail.description
    ? stripHtml(detail.description).slice(0, 200)
    : `Watch ${detail.title} episode ${number} online on Minna.`;
  const image = detail.banner ?? detail.image;
  const images = image ? [{ url: image, alt: detail.title }] : [];

  return {
    title,
    description,
    alternates: localeAlternates(
      await canonicalWatchHref(detail.id, number, detail.title),
      locale,
    ),
    openGraph: {
      ...openGraphLocaleSet(locale),
      title,
      description,
      type: "video.episode",
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: images.map((entry) => entry.url),
    },
  };
}

/**
 * Episode watch page (EPIC-06). Server-rendered for SEO: the anime record flows
 * through the Redis-cached AniList layer while the active pre-roll ad and the
 * signed-in viewer's resume position load in parallel. Only the player is a
 * client island — it embeds the stream in the viewer's browser (the source
 * sites block datacenter IPs, so playback can't be resolved server-side). A
 * missing anime is a 404; an episode the embed can't resolve degrades to the
 * player's unavailable state.
 */
export default async function WatchPage({ params }: WatchRouteProps) {
  const { animeId, episodeId } = await params;
  const locale = await resolveLocale(params);

  const detail = await getAnimeInfo(parseAnimeParam(animeId));
  if (!detail) notFound();

  const located = locateEpisode(detail.episodes, episodeId);
  if (!located) notFound();

  // Keep SEO on one canonical URL: a bare id, stale anime slug, legacy opaque
  // episode id or bare number 308s to `/watch/{id}-{slug}/episode-{n}`. The
  // proxy issues that 308 before the response starts (see `src/proxy.ts`); this
  // is the standby for the two cases it cannot resolve on its own — an id whose
  // slug nothing has claimed yet, and a legacy opaque episode id, whose number
  // is only knowable from the episode list fetched above.
  // Resolved once and reused: the page's own canonical URL is built from it,
  // and so are the links it renders — the episode navigation and the way back
  // to the anime. Those used to derive their segment from the title, which is
  // how a player linked its own next episode at a URL the proxy then 308'd.
  const slug = await canonicalSlug(detail.id, detail.title);
  const canonical = watchHref(slug, located.current.number);
  if (located.known && `/watch/${animeId}/${episodeId}` !== canonical) {
    permanentRedirect({ href: canonical, locale });
  }

  const user = await getCurrentUser();

  const [ad, progress, t] = await Promise.all([
    getActivePreRollAd(),
    // Progress rows are keyed by (anime, resolved episode id), not the URL
    // slug — an episode id repeats across anime, so the anime is part of the key.
    user?.id
      ? getWatchProgress(user.id, detail.id, located.current.id)
      : Promise.resolve(null),
    getTranslations("player"),
  ]);

  // Resume from the saved position unless the episode was already finished.
  const initialTime =
    progress && !progress.completed ? progress.positionSeconds : 0;

  const { current, prev, next } = located;
  const poster = detail.banner ?? detail.image;

  return (
    <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 pt-20 pb-10 sm:px-6 lg:px-8">
      <WatchExperience
        animeId={detail.id}
        animeSlug={slug}
        malId={detail.malId}
        animeTitle={detail.title}
        episode={{
          id: current.id,
          number: current.number,
          title: current.title,
        }}
        prevEpisode={prev ? { id: prev.id, number: prev.number } : null}
        nextEpisode={next ? { id: next.id, number: next.number } : null}
        ad={ad}
        poster={poster}
        totalEpisodes={detail.totalEpisodes ?? detail.episodes.length}
        initialTime={initialTime}
        isAuthenticated={Boolean(user?.id)}
      />

      {/* Title + context */}
      <div className="mt-6 flex flex-col gap-1">
        <p className="text-muted-foreground text-xs tracking-widest uppercase">
          {t("nowPlaying")}
        </p>
        <h1 className="text-foreground text-xl font-extrabold tracking-tight sm:text-2xl">
          {detail.title}
        </h1>
        <p className="text-muted-foreground text-sm">
          {/* The name streams in behind the number, so a cold title lookup
              never holds up the player above it. */}
          <Suspense fallback={t("episodeLabel", { number: current.number })}>
            <WatchEpisodeLabel
              animeId={detail.id}
              episodeNumber={current.number}
              title={current.title}
            />
          </Suspense>
        </p>
      </div>

      <AdBanner placement="watch" className="mt-8" />

      {/* Member reviews of this episode (COMM-07). Streamed in a boundary of
          its own so its two queries never hold up the player. */}
      <Suspense fallback={null}>
        <EpisodeReviews
          animeId={detail.id}
          animeTitle={detail.title}
          animeImage={detail.image}
          episodeNumber={current.number}
          isAuthenticated={Boolean(user?.id)}
          loginHref={`/login?callbackUrl=${encodeURIComponent(canonical)}`}
        />
      </Suspense>

      {/* Second slot, deep in the page where the watch session actually dwells
          — an episode runs ~24 minutes against a single impression up top.
          Renders only once `NEXT_PUBLIC_ADSTERRA_WATCH_SECONDARY` names a unit
          of its own, so the two watch slots never share one key. */}
      <AdBanner placement="watchSecondary" className="mt-10" />

      {/* Full episode list for jumping around (DETAIL-02 reuse). */}
      {detail.episodes.length > 0 && (
        <div className="mt-10">
          {/* Titles for a whole series can take a moment to resolve, so the
              list streams in: the numbered version below renders at once and
              is replaced by the titled one when the lookup lands. */}
          <Suspense
            fallback={
              <EpisodeList
                animeSlug={slug}
                episodes={detail.episodes}
                activeEpisodeNumber={current.number}
              />
            }
          >
            <WatchEpisodeList
              animeId={detail.id}
              animeSlug={slug}
              episodes={detail.episodes}
              activeEpisodeNumber={current.number}
            />
          </Suspense>
        </div>
      )}
    </main>
  );
}
