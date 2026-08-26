import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { GenreList } from "@/components/browse/genre-list";
import { listGenreAnime } from "@/lib/anime/browse";
import { getCategories } from "@/lib/anime/categories";
import { findCategoryBySlug } from "@/lib/anime/genres";

interface GenrePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const categories = await getCategories();
  return categories.map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({
  params,
}: GenrePageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = findCategoryBySlug(slug);
  const t = await getTranslations("browse.genre");

  if (!category) {
    return {
      title: "Genre - Minna",
      robots: { index: false, follow: false },
    };
  }

  const title = t("title", { genre: category.name }) + " - Minna";
  const description = t("subtitle", { genre: category.name });

  return {
    title,
    description,
    alternates: { canonical: "/genre/" + category.slug },
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function GenrePage({ params }: GenrePageProps) {
  const { slug } = await params;
  const category = findCategoryBySlug(slug);
  if (!category) notFound();

  const t = await getTranslations("browse.genre");
  const initialPage = await listGenreAnime(category.slug, 1);
  if (!initialPage) notFound();

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-24 pb-16 sm:px-6 sm:pt-28 lg:px-8">
      <header className="mb-8 flex flex-col gap-2">
        <h1 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          {t("heading", { genre: category.name })}
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm sm:text-base">
          {t("subtitle", { genre: category.name })}
        </p>
      </header>

      <GenreList slug={category.slug} initialPage={initialPage} />
    </main>
  );
}
