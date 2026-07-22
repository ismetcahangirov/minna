import { getTranslations } from "next-intl/server";

import { HeroCarousel } from "@/components/home/hero-carousel";
import { getAnimeSection } from "@/lib/anime/catalog";

/**
 * Home hero (HOME-01). Fetches the top trending titles server-side and hands
 * them to the client carousel as its seed (SSR → LCP/SEO). When no catalog is
 * available (Consumet unconfigured/unreachable) it degrades to a branded
 * placeholder so the page never renders an empty hero.
 */
export async function HeroSection() {
  const featured = await getAnimeSection("trending", 5);

  if (featured.length === 0) return <HeroFallback />;

  return <HeroCarousel initialItems={featured} />;
}

async function HeroFallback() {
  const t = await getTranslations();

  return (
    <section className="relative flex h-[68vh] max-h-[760px] min-h-[440px] w-full flex-col items-center justify-center gap-5 bg-black px-6 text-center">
      <h1 className="text-primary text-5xl font-extrabold tracking-tight sm:text-7xl">
        {t("common.appName").toUpperCase()}
      </h1>
      <p className="text-muted-foreground max-w-md text-base">
        {t("home.hero.tagline")}
      </p>
    </section>
  );
}
