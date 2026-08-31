import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { AdBanner } from "@/components/home/ad-banner";
import { AnimeRow, AnimeRowSkeleton } from "@/components/home/anime-row";
import { CatalogNotice } from "@/components/home/catalog-notice";
import { HeroSection } from "@/components/home/hero-section";
import { resolveLocale, type LocaleRouteProps } from "@/i18n/route-locale";
import {
  localeAlternates,
  openGraphLocaleSet,
} from "@/lib/seo/locale-alternates";

export async function generateMetadata({
  params,
}: LocaleRouteProps): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale });
  const title = "Minna — Watch Anime Online";
  const description = t("home.hero.tagline");

  return {
    title,
    description,
    // Restated even though the layout sets the same block: a page's `openGraph`
    // replaces the layout's wholesale rather than merging into it, so the
    // locale tags would disappear from the home page alone if it relied on
    // inheritance.
    alternates: localeAlternates("/", locale),
    openGraph: {
      ...openGraphLocaleSet(locale),
      title,
      description,
      type: "website",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

/**
 * Home page (EPIC-04). The hero is rendered inline so its trending banner is
 * in the initial server HTML (LCP/SEO); the section rows stream in behind
 * `<Suspense>` skeletons as their Redis-cached Consumet fetches resolve
 * (HOME-07). Section order follows HOME-02..HOME-05.
 */
export default async function Home() {
  const t = await getTranslations("home.hero");

  return (
    <main className="flex flex-1 flex-col gap-10 pb-16 sm:gap-12">
      {/* The page's single `h1`, and the only one on it (SEO-01). It is
          screen-reader-only because the hero carries the design's opening
          statement visually; what the hero cannot be is the heading, since
          every slide is in the DOM at once and its text is a rotating anime
          title rather than a description of this page. */}
      <h1 className="sr-only">{t("heading")}</h1>

      <HeroSection />

      <AdBanner placement="home" />

      <div className="flex flex-col gap-10 sm:gap-12">
        <Suspense fallback={<AnimeRowSkeleton />}>
          <AnimeRow section="recent" titleKey="latest" seeAllHref="/new" />
        </Suspense>
        <Suspense fallback={<AnimeRowSkeleton />}>
          <AnimeRow
            section="popular"
            titleKey="popular"
            seeAllHref="/popular"
          />
        </Suspense>
        <Suspense fallback={<AnimeRowSkeleton />}>
          <AnimeRow section="top-rated" titleKey="topRated" />
        </Suspense>
        <Suspense fallback={<AnimeRowSkeleton />}>
          <AnimeRow section="trending" titleKey="trending" />
        </Suspense>

        {/* Only renders when every section came back empty (total outage). */}
        <Suspense fallback={null}>
          <CatalogNotice />
        </Suspense>
      </div>
    </main>
  );
}
