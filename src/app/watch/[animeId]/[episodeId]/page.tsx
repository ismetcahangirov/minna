import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { EpisodeList } from "@/components/anime/episode-list";
import { WatchExperience } from "@/components/watch/watch-experience";
import { getActivePreRollAd } from "@/lib/ads/queries";
import { getAnimeInfo } from "@/lib/anime/detail";
import { parseAnimeParam } from "@/lib/anime/href";
import { stripHtml } from "@/lib/anime/text";
import type { AnimeEpisode } from "@/lib/anime/types";
import { getCurrentUser } from "@/lib/auth/session";
import { getWatchProgress } from "@/lib/watch/queries";

interface WatchRouteProps {
  params: Promise<{ animeId: string; episodeId: string }>;
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
  const index = ordered.findIndex((episode) => episode.id === episodeId);

  if (index === -1) {
    if (ordered.length > 0) return null; // id not part of this anime → 404
    return {
      current: {
        id: episodeId,
        number: 1,
        title: null,
        description: null,
        airDate: null,
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
    alternates: { canonical: `/watch/${detail.id}/${episodeId}` },
    openGraph: { title, description, type: "video.episode", images },
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

  const detail = await getAnimeInfo(parseAnimeParam(animeId));
  if (!detail) notFound();

  const located = locateEpisode(detail.episodes, episodeId);
  if (!located) notFound();

  const user = await getCurrentUser();

  const [ad, progress, t] = await Promise.all([
    getActivePreRollAd(),
    user?.id ? getWatchProgress(user.id, episodeId) : Promise.resolve(null),
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
          {current.title
            ? `${t("episodeLabel", { number: current.number })} · ${current.title}`
            : t("episodeLabel", { number: current.number })}
        </p>
      </div>

      {/* Full episode list for jumping around (DETAIL-02 reuse). */}
      {detail.episodes.length > 0 && (
        <div className="mt-10">
          <EpisodeList animeId={detail.id} episodes={detail.episodes} />
        </div>
      )}
    </main>
  );
}
