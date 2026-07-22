import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { AnimeRow, AnimeRowSkeleton } from "@/components/home/anime-row";
import { HeroSection } from "@/components/home/hero-section";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  const title = "Minna — Watch Anime Online";
  const description = t("home.hero.tagline");

  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

/**
 * Home page (EPIC-04). The hero is rendered inline so its trending banner is
 * in the initial server HTML (LCP/SEO); the section rows stream in behind
 * `<Suspense>` skeletons as their Redis-cached Consumet fetches resolve
 * (HOME-07). Section order follows HOME-02..HOME-05.
 */
export default function Home() {
  return (
    <main className="flex flex-1 flex-col gap-10 pb-16 sm:gap-12">
      <HeroSection />

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
      </div>
    </main>
  );
}
