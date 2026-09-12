"use client";

import { Film } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

/**
 * Shown when `getAnimeInfo` cannot resolve a title (unknown id, or the catalog
 * provider unreachable — see the data layer). The full atmospheric 404 lives in
 * EPIC-11; this is a scoped, localized fallback for the anime segment.
 *
 * A client component, and it has to be. A `not-found.tsx` is rendered as part
 * of its segment's render and receives no params, so there is no `[locale]` to
 * hand `setRequestLocale` — and a server-side `getTranslations()` without one
 * falls back to reading the locale out of the request headers. That one header
 * read opted the whole `/anime/[id]` route out of static rendering, which is
 * most of what PERF-05 is about: the page it guards is the largest crawl
 * surface on the site. Read from the client provider instead, the same
 * translations cost the route nothing.
 */
export default function AnimeNotFound() {
  const t = useTranslations("detail.notFound");

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <Film className="text-muted-foreground size-10" aria-hidden />
      <h1 className="text-foreground text-2xl font-extrabold tracking-tight sm:text-3xl">
        {t("title")}
      </h1>
      <p className="text-muted-foreground max-w-md text-sm">
        {t("description")}
      </p>
      <Button nativeButton={false} render={<Link href="/" />}>
        {t("browse")}
      </Button>
    </main>
  );
}
