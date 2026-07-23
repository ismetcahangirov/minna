import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { AnimeDetailView } from "@/components/anime/anime-detail";
import { getAnimeInfo } from "@/lib/anime/detail";
import { animeHref, parseAnimeParam } from "@/lib/anime/href";
import { stripHtml } from "@/lib/anime/text";
import { getCurrentUser } from "@/lib/auth/session";
import { isFavorite } from "@/lib/favorites/queries";

interface AnimeDetailRouteProps {
  params: Promise<{ id: string }>;
}

/**
 * Dynamic SEO metadata (DETAIL-04): title, description and Open Graph/Twitter
 * cards built from the anime record. Shares `getAnimeInfo`'s per-request cache
 * with the page component, so this adds no extra fetch.
 */
export async function generateMetadata({
  params,
}: AnimeDetailRouteProps): Promise<Metadata> {
  const { id } = await params;
  const detail = await getAnimeInfo(parseAnimeParam(id));

  if (!detail) {
    return { title: "Anime not found — Minna" };
  }

  const title = `${detail.title} — Minna`;
  const description = detail.description
    ? stripHtml(detail.description).slice(0, 200)
    : `Watch ${detail.title} online on Minna.`;
  const image = detail.banner ?? detail.image;
  const images = image ? [{ url: image, alt: detail.title }] : [];

  return {
    title,
    description,
    alternates: { canonical: animeHref(detail.id, detail.title) },
    openGraph: {
      title,
      description,
      type: "video.tv_show",
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
 * Anime detail page (EPIC-05). Server-rendered (SSR) for SEO: the record is
 * fetched through the Redis-cached Consumet layer and a missing/unresolvable
 * title becomes a 404. The signed-in user's favorite state seeds the button.
 */
export default async function AnimeDetailPage({
  params,
}: AnimeDetailRouteProps) {
  const { id } = await params;
  const detail = await getAnimeInfo(parseAnimeParam(id));
  if (!detail) notFound();

  // Consolidate SEO on one canonical URL: a bare id or a stale/wrong slug is
  // 301'd (308) to `/anime/{id}-{slug}`. Old links and DB-stored id links keep
  // working via this redirect.
  const canonical = animeHref(detail.id, detail.title);
  if (`/anime/${id}` !== canonical) permanentRedirect(canonical);

  const user = await getCurrentUser();
  const favorited = user?.id ? await isFavorite(user.id, detail.id) : false;
  const loginHref = `/login?callbackUrl=${encodeURIComponent(canonical)}`;

  return (
    <main className="flex flex-1 flex-col pb-8">
      <AnimeDetailView
        detail={detail}
        isAuthenticated={Boolean(user?.id)}
        isFavorite={favorited}
        loginHref={loginHref}
      />
    </main>
  );
}
