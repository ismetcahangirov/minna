import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { BlogList } from "@/components/blog/blog-list";
import { JsonLd } from "@/components/seo/json-ld";
import { listBlogs } from "@/lib/blog/queries";
import { buildBlogListJsonLd } from "@/lib/seo/blog-jsonld";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("browse.blogs");
  const title = `${t("title")} — Minna`;
  const description = t("subtitle");

  return {
    title,
    description,
    alternates: { canonical: "/blogs" },
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

/**
 * Blogs page (LIST-03). The shell and the first page of posts are
 * server-rendered for SEO and a no-flash first paint; the {@link BlogList}
 * client island takes over for infinite scroll.
 */
export default async function BlogsPage() {
  const t = await getTranslations("browse.blogs");
  const initialPage = await listBlogs(1);

  // Names the page as a curated collection and its first page of posts, so
  // `/blogs` reads as the blog's hub rather than one more page of prose.
  const jsonLd = buildBlogListJsonLd({
    path: "/blogs",
    name: t("heading"),
    description: t("subtitle"),
    posts: initialPage.items,
  });

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-24 pb-16 sm:px-6 sm:pt-28 lg:px-8">
      <JsonLd data={jsonLd} />
      <header className="mb-8 flex flex-col gap-2">
        <h1 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          {t("heading")}
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm sm:text-base">
          {t("subtitle")}
        </p>
      </header>

      <BlogList initialPage={initialPage} />
    </main>
  );
}
