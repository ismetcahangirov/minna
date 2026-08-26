import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AnimeDetailView } from "@/components/anime/anime-detail";
import { permanentRedirect } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/route-locale";
import { getAnimeInfo } from "@/lib/anime/detail";
import { canonicalAnimeHref } from "@/lib/anime/canonical-slug";
import { parseAnimeParam } from "@/lib/anime/href";
import { stripHtml } from "@/lib/anime/text";
import { getCurrentUser } from "@/lib/auth/session";
import { isFavorite } from "@/lib/favorites/queries";
import { getLibraryEntry } from "@/lib/library/queries";
import {
  localeAlternates,
  openGraphLocaleSet,
} from "@/lib/seo/locale-alternates";

interface AnimeDetailRouteProps {
  params: Promise<{ locale: string; id: string }>;
}

/**
 * Dynamic SEO metadata (DETAIL-04): title, description and Open Graph/Twitter
 * cards built from the anime record. Shares `getAnimeInfo`'s per-request cache
 * with the page component, so this adds no extra fetch.
 */
export async function generateMetadata({
  params,
}: AnimeDetailRouteProps): Promise<Metadata> {
  const locale = await resolveLocale(params);
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
    alternates: localeAlternates(
      await canonicalAnimeHref(detail.id, detail.title),
      locale,
    ),
    openGraph: {
      ...openGraphLocaleSet(locale),
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
  const locale = await resolveLocale(params);
  const detail = await getAnimeInfo(parseAnimeParam(id));
  if (!detail) notFound();

  // Consolidate SEO on one canonical URL. The 308 itself is issued by the
  // proxy, which is the only place a status code can still be set (see
  // `canonicalAnimePath` in `src/proxy.ts`); this is the standby for the one
  // case the proxy cannot cover — an id nothing has claimed a slug for yet —
  // and degrades to the client-side redirect Next emits mid-stream.
  const canonical = await canonicalAnimeHref(detail.id, detail.title);
  if (`/anime/${id}` !== canonical) {
    permanentRedirect({ href: canonical, locale });
  }

  const user = await getCurrentUser();
  const [favorited, libraryEntry] = user?.id
    ? await Promise.all([
        isFavorite(user.id, detail.id),
        getLibraryEntry(user.id, detail.id),
      ])
    : [false, null];
  const loginHref = `/login?callbackUrl=${encodeURIComponent(canonical)}`;

  return (
    <main className="flex flex-1 flex-col pb-8">
      <AnimeDetailView
        detail={detail}
        isAuthenticated={Boolean(user?.id)}
        isFavorite={favorited}
        libraryEntry={libraryEntry}
        loginHref={loginHref}
      />
    </main>
  );
}
