import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Newspaper } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { BlogCard } from "@/components/blog/blog-card";
import { JsonLd } from "@/components/seo/json-ld";
import type { Locale } from "@/i18n/config";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/route-locale";
import { getBlogTagBySlug, listBlogsByTag } from "@/lib/blog/tags";
import { buildBlogListJsonLd } from "@/lib/seo/blog-jsonld";
import {
  localeAlternates,
  openGraphLocaleSet,
} from "@/lib/seo/locale-alternates";

interface TagArchiveRouteProps {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

const GRID_CLASS =
  "grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4";

/** Parses `?page=` defensively; anything unusable is page 1. */
function pageFrom(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

/** The tag's own copy, falling back to a generated sentence when it has none. */
async function archiveCopy(tagName: string, description: string | null) {
  const t = await getTranslations("browse.blogs.tag");
  return {
    heading: t("heading", { tag: tagName }),
    description:
      description?.trim() || t("fallbackDescription", { tag: tagName }),
  };
}

export async function generateMetadata({
  params,
  searchParams,
}: TagArchiveRouteProps): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const [{ slug }, { page }] = await Promise.all([params, searchParams]);
  const tag = await getBlogTagBySlug(slug);

  if (!tag) return { title: "Tag not found — Minna" };

  const current = pageFrom(page);
  const copy = await archiveCopy(tag.name, tag.description);
  const title = `${copy.heading} — Minna`;

  return {
    title: current > 1 ? `${title} (${current})` : title,
    description: copy.description,
    // Every page of an archive canonicalises to itself — pointing page 2 at
    // page 1 would tell Google the posts listed there do not exist.
    alternates: localeAlternates(
      current > 1
        ? `/blogs/tag/${tag.slug}?page=${current}`
        : `/blogs/tag/${tag.slug}`,
      locale,
    ),
    openGraph: {
      ...openGraphLocaleSet(locale),
      title,
      description: copy.description,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: copy.description,
    },
  };
}

/**
 * Tag archive (SEO-05): every published post carrying one topic.
 *
 * This is the hub of a topic cluster — the page that makes the tags on a post
 * more than decoration. It is deliberately server-rendered with crawlable
 * `?page=` links rather than the infinite scroll the main listing uses: an
 * archive exists to be crawled, and posts behind a scroll sentinel are not.
 */
export default async function BlogTagArchivePage({
  params,
  searchParams,
}: TagArchiveRouteProps) {
  const [{ slug }, { page }] = await Promise.all([params, searchParams]);
  const tag = await getBlogTagBySlug(slug);

  if (!tag) notFound();

  const t = await getTranslations("browse.blogs");
  const current = pageFrom(page);
  const locale = await getLocale();
  const result = await listBlogsByTag(tag.id, current, locale as Locale);

  // A tag with no published posts is not a page worth serving or indexing.
  if (result.items.length === 0 && current === 1) notFound();

  const copy = await archiveCopy(tag.name, tag.description);
  const basePath = `/blogs/tag/${tag.slug}`;

  const jsonLd = buildBlogListJsonLd({
    path: current > 1 ? `${basePath}?page=${current}` : basePath,
    name: copy.heading,
    description: copy.description,
    posts: result.items,
    type: "CollectionPage",
  });

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-24 pb-16 sm:px-6 sm:pt-28 lg:px-8">
      <JsonLd data={jsonLd} />

      <Link
        href="/blogs"
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring mb-6 inline-flex items-center gap-2 text-sm font-medium transition-colors outline-none focus-visible:ring-2"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t("backToBlogs")}
      </Link>

      <header className="mb-8 flex flex-col gap-2">
        <p className="text-primary text-xs font-semibold tracking-wide uppercase">
          {t("tag.eyebrow")}
        </p>
        <h1 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          {copy.heading}
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm sm:text-base">
          {copy.description}
        </p>
      </header>

      {result.items.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center gap-3 py-20 text-center">
          <Newspaper className="size-8" aria-hidden />
          <p className="text-sm">{t("empty")}</p>
        </div>
      ) : (
        <ul className={GRID_CLASS}>
          {result.items.map((post, index) => (
            <li key={post.id}>
              <BlogCard blog={post} priority={index < 4} />
            </li>
          ))}
        </ul>
      )}

      {(current > 1 || result.hasNextPage) && (
        <nav
          aria-label={t("tag.pagination")}
          className="border-border mt-12 flex items-center justify-between border-t pt-6"
        >
          {current > 1 ? (
            <Link
              href={
                current === 2 ? basePath : `${basePath}?page=${current - 1}`
              }
              rel="prev"
              className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-2 text-sm font-medium transition-colors outline-none focus-visible:ring-2"
            >
              <ArrowLeft className="size-4" aria-hidden />
              {t("tag.previous")}
            </Link>
          ) : (
            <span />
          )}

          {result.hasNextPage && (
            <Link
              href={`${basePath}?page=${current + 1}`}
              rel="next"
              className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-2 text-sm font-medium transition-colors outline-none focus-visible:ring-2"
            >
              {t("tag.next")}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          )}
        </nav>
      )}
    </main>
  );
}
