import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { EpisodeCards } from "@/components/anime/episode-cards";
import { SeasonSwitcher } from "@/components/anime/season-tabs";
import { getAnimeInfo } from "@/lib/anime/detail";
import {
  animeEpisodesHref,
  animeHref,
  parseAnimeParam,
} from "@/lib/anime/href";
import { getCurrentUser } from "@/lib/auth/session";
import { getAnimeWatchStates } from "@/lib/watch/queries";

interface EpisodesRouteProps {
  params: Promise<{ id: string }>;
}

/** SEO metadata for the episodes list; canonicalises to the slugged path. */
export async function generateMetadata({
  params,
}: EpisodesRouteProps): Promise<Metadata> {
  const { id } = await params;
  const detail = await getAnimeInfo(parseAnimeParam(id));
  if (!detail) return { title: "Anime not found — Minna" };

  const title = `${detail.title} — Episodes — Minna`;
  return {
    title,
    description: `Watch every episode of ${detail.title} on Minna.`,
    alternates: { canonical: animeEpisodesHref(detail.id, detail.title) },
  };
}

/**
 * Episodes list page (`/anime/[id]/episodes`). Reached from a season poster
 * card or the detail page's watch button. Server-rendered for SEO; the episode
 * cards paginate their own rendering with infinite scroll on the client.
 */
export default async function AnimeEpisodesPage({
  params,
}: EpisodesRouteProps) {
  const { id } = await params;
  const detail = await getAnimeInfo(parseAnimeParam(id));
  if (!detail) notFound();

  // Keep SEO on one canonical URL: a bare id or stale slug 308s to the slugged
  // episodes path.
  const canonical = animeEpisodesHref(detail.id, detail.title);
  if (`/anime/${id}/episodes` !== canonical) permanentRedirect(canonical);

  const t = await getTranslations("detail");
  const user = await getCurrentUser();
  const watchStates = user?.id
    ? await getAnimeWatchStates(user.id, detail.id)
    : {};

  return (
    <main className="flex flex-1 flex-col pb-10">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
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
          <EpisodeCards
            animeId={detail.id}
            animeTitle={detail.title}
            episodes={detail.episodes}
            thumbnail={detail.banner ?? detail.image}
            watchStates={watchStates}
          />
        </div>
      </div>
    </main>
  );
}
