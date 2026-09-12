import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AnimeDetailView } from "@/components/anime/anime-detail";
import { permanentRedirect } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/route-locale";
import { getAnimeInfo } from "@/lib/anime/detail";
import { canonicalSeasonAwareHref } from "@/lib/anime/seasons";
import { parseAnimeParam } from "@/lib/anime/href";
import { stripHtml } from "@/lib/anime/text";
import {
  localeAlternates,
  openGraphLocaleSet,
} from "@/lib/seo/locale-alternates";

interface AnimeDetailRouteProps {
  params: Promise<{ locale: string; id: string }>;
}

/**
 * Rendered once an hour and served from the edge in between (PERF-05).
 *
 * Nothing on this page is per-visitor any more: the favorite button, the
 * library menu, the progress bar and the episode ticks read their own state in
 * the browser (`@/lib/hooks/use-viewer`), and the episode list's paged, sorted
 * and filtered views moved to `/anime/[id]/episodes` so no search param is read
 * here. An anime record changes on the scale of a new episode a week, so an
 * hour of staleness costs nothing and the page stops invoking a function per
 * crawl of the sitemap's thousands of entries.
 */
export const revalidate = 3600;

/**
 * Empty on purpose, and required: a dynamic segment with no
 * `generateStaticParams` at all is served fully dynamically, `revalidate` or
 * not. Declaring it — with nothing to prerender at build time, because the
 * catalog is thousands of titles deep and most of them are never asked for —
 * is what puts the route in the prerender manifest, so the first request for a
 * title renders it and every request after that is answered from the cache
 * until it goes stale.
 */
export function generateStaticParams() {
  return [];
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
      await canonicalSeasonAwareHref(detail),
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
 * Anime detail page (EPIC-05). Prerendered on demand and revalidated hourly
 * (see `revalidate` above) for SEO: the record is fetched through the
 * Redis-cached AniList layer and a missing/unresolvable title becomes a 404.
 * Nothing about the viewer is rendered here — the controls that need it read it
 * themselves, in the browser.
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
  const canonical = await canonicalSeasonAwareHref(detail);
  if (`/anime/${id}` !== canonical) {
    permanentRedirect({ href: canonical, locale });
  }

  const loginHref = `/login?callbackUrl=${encodeURIComponent(canonical)}`;

  return (
    <main className="flex flex-1 flex-col pb-8">
      <AnimeDetailView
        detail={detail}
        loginHref={loginHref}
        basePath={canonical}
        episodesPath={`${canonical}/episodes`}
      />
    </main>
  );
}
