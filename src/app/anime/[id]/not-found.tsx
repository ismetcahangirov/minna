import { Film } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";

/**
 * Shown when `getAnimeInfo` cannot resolve a title (unknown id, or Consumet
 * unconfigured/unreachable — see the data layer). The full atmospheric 404
 * lives in EPIC-11; this is a scoped, localized fallback for the anime segment.
 */
export default async function AnimeNotFound() {
  const t = await getTranslations("detail.notFound");

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
