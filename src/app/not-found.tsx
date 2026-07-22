import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { NotFoundBackground } from "@/components/not-found/not-found-background";
import { Button } from "@/components/ui/button";

/**
 * Global 404 page (EPIC-11 / 404-01). The root `app/not-found.tsx` catches both
 * `notFound()` calls and any unmatched URL across the app, composing with the
 * root layout (header + footer) so the shell stays consistent. Next.js returns
 * the 404 status and injects `noindex` automatically, so no manual robots config
 * is needed here.
 *
 * Per DESIGN-SPEC.md §3.7 / §6.4 the large "404" sits in the foreground —
 * hard-cornered, flat, no glow — with the localized message and a single route
 * back home, layered over the atmospheric ember background (404-02).
 */
export default async function NotFound() {
  const t = await getTranslations("notFound");

  return (
    <>
      <NotFoundBackground />
      <main className="relative flex flex-1 flex-col items-center justify-center gap-6 px-4 py-24 text-center sm:py-28">
        <p className="text-foreground text-7xl font-extrabold tracking-tighter tabular-nums sm:text-8xl">
          404
        </p>

        <div className="flex max-w-md flex-col items-center gap-3">
          <h1 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
            {t("title")}
          </h1>
          <p className="text-muted-foreground text-sm">{t("description")}</p>
        </div>

        <Button
          nativeButton={false}
          render={<Link href="/" />}
          size="lg"
          className="mt-2"
        >
          {t("backHome")}
        </Button>
      </main>
    </>
  );
}
