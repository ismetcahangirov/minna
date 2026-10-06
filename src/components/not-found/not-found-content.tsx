"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

/**
 * The 404 text, translated from the client provider: a `not-found.tsx` gets no
 * params, so a server-side `getTranslations()` there can only find the locale
 * in request headers, which a cached route never has (PERF-06).
 */
export function NotFoundContent() {
  const t = useTranslations("notFound");

  return (
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
  );
}
