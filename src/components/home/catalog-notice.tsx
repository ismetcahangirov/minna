import { ServerCrash } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { getAnimeSection } from "@/lib/anime/catalog";
import { ANIME_SECTIONS } from "@/lib/anime/types";

/**
 * Home-page empty state for a total catalog outage.
 *
 * Each {@link import("./anime-row").AnimeRow} renders nothing when its section
 * is empty, which is right for one missing row but leaves the whole page blank
 * when every upstream source is down (AniList disabled and Kitsu unreachable —
 * see `@/lib/anime/provider`). This says so instead of showing an empty page.
 *
 * Renders nothing as soon as any section has results, so a single flaky section
 * never triggers it. Reads the same `getAnimeSection` calls the rows do — those
 * are React-cached per request, so this adds no extra fetch.
 *
 * Design system: sharp corners, flat surface, lucide icon — no radius, gradient
 * or glassmorphism.
 */
export async function CatalogNotice() {
  const sections = await Promise.all(
    ANIME_SECTIONS.map((section) => getAnimeSection(section)),
  );

  if (sections.some((items) => items.length > 0)) return null;

  const t = await getTranslations("home.unavailable");

  return (
    <section className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8">
      <div className="border-border bg-surface flex flex-col items-center gap-3 border px-6 py-16 text-center">
        <ServerCrash className="text-primary size-8" aria-hidden />
        <p className="text-foreground text-base font-medium">{t("title")}</p>
        <p className="text-muted-foreground max-w-md text-sm">{t("hint")}</p>
      </div>
    </section>
  );
}
