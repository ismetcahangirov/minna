import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { NewList } from "@/components/browse/new-list";
import { listRecentAnime } from "@/lib/anime/browse";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("browse.new");
  const title = `${t("title")} — Minna`;
  const description = t("subtitle");

  return {
    title,
    description,
    alternates: { canonical: "/new" },
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

/**
 * New/Recent page. The shell and the first page of cards are server-rendered
 * for SEO and a no-flash first paint; the {@link NewList} client island takes
 * over for infinite scroll.
 */
export default async function NewPage() {
  const t = await getTranslations("browse.new");
  const initialPage = await listRecentAnime(1);

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-24 pb-16 sm:px-6 sm:pt-28 lg:px-8">
      <header className="mb-8 flex flex-col gap-2">
        <h1 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          {t("heading")}
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm sm:text-base">
          {t("subtitle")}
        </p>
      </header>

      <NewList initialPage={initialPage} />
    </main>
  );
}
