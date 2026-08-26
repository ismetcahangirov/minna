import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { SearchBackground } from "@/components/search/search-background";
import { SearchExperience } from "@/components/search/search-experience";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("search");
  const title = `${t("title")} — Minna`;
  const description = t("subtitle");

  return {
    title,
    description,
    alternates: { canonical: "/search" },
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

interface SearchPageProps {
  searchParams: Promise<{ q?: string | string[] }>;
}

/**
 * Search page (EPIC-07). The shell is server-rendered for SEO and reads the
 * `?q=` deep-link to seed the input; the interactive search (debounced input,
 * genre facet, live results) runs in the {@link SearchExperience} client island.
 * A fixed teal {@link SearchBackground} provides the atmospheric layer
 * (SEARCH-03), an intentional exception to the flat-UI rule.
 */
export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  const initialQuery = Array.isArray(q) ? (q[0] ?? "") : (q ?? "");

  return (
    <main className="relative flex flex-1 flex-col pt-24 pb-16 sm:pt-28">
      <SearchBackground />
      <SearchExperience initialQuery={initialQuery} />
    </main>
  );
}
