import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Languages, List } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";

import { JsonLd } from "@/components/seo/json-ld";
import {
  defaultLocale,
  isLocale,
  openGraphLocales,
  type Locale,
} from "@/i18n/config";
import { renderBlogMarkdown } from "@/lib/blog/markdown";
import { getBlogBySlug } from "@/lib/blog/queries";
import { blogDescription, buildBlogJsonLd } from "@/lib/seo/blog-jsonld";
import { localeNames } from "@/i18n/config";
import type { BlogDetail } from "@/lib/blog/types";

interface BlogDetailRouteProps {
  params: Promise<{ slug: string }>;
}

/**
 * The `hreflang` map for a translated article: every language version keyed by
 * its tag, plus `x-default`.
 *
 * The set is reciprocal by construction — each version lists all of them,
 * itself included — because a one-way link is the failure Google responds to by
 * ignoring the whole set. `x-default` names the version to fall back to for a
 * language nobody here speaks, and points at the site's default locale when the
 * article has one.
 *
 * Returns `undefined` for an untranslated post: a lone `hreflang` pointing only
 * at itself claims a choice that does not exist.
 */
function hreflangMap(post: BlogDetail): Record<string, string> | undefined {
  if (post.translations.length === 0) return undefined;

  const languages: Record<string, string> = {
    [post.language]: `/blogs/${post.slug}`,
  };
  for (const sibling of post.translations) {
    languages[sibling.language] = `/blogs/${sibling.slug}`;
  }

  const fallback = languages[defaultLocale] ?? `/blogs/${post.slug}`;
  return { ...languages, "x-default": fallback };
}

/**
 * Dynamic SEO metadata for a blog post (LIST-05). Both the post and its
 * rendered body are memoized per request, so this shares the page's work rather
 * than repeating the query and the Markdown parse.
 */
export async function generateMetadata({
  params,
}: BlogDetailRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogBySlug(slug);

  if (!post) return { title: "Blog not found — Minna" };

  const body = await renderBlogMarkdown(post.content);
  const title = `${post.title} — Minna`;
  const description = blogDescription(post, body.text);
  const images = post.coverImage
    ? [{ url: post.coverImage, alt: post.coverImageAlt ?? post.title }]
    : [];

  return {
    title,
    description,
    // Each translation stays its own canonical URL — pointing them all at one
    // would tell Google the other language versions should not be indexed.
    alternates: {
      canonical: `/blogs/${post.slug}`,
      languages: hreflangMap(post),
    },
    // `article:*` is what turns a generic OG card into a dated, attributed
    // article for the crawlers and social previews that read it.
    openGraph: {
      title,
      description,
      type: "article",
      url: `/blogs/${post.slug}`,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: post.author ? [post.author] : undefined,
      tags: post.tags.map((tag) => tag.name),
      locale: isLocale(post.language)
        ? openGraphLocales[post.language as Locale]
        : undefined,
      alternateLocale: post.translations
        .filter((sibling) => isLocale(sibling.language))
        .map((sibling) => openGraphLocales[sibling.language as Locale]),
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: images.map((entry) => entry.url),
    },
    keywords: post.tags.length > 0 ? post.tags.map((t) => t.name) : undefined,
  };
}

/**
 * Blog detail page (LIST-05 / SEO-05). The cover image is a full-bleed fixed
 * background with the article over a flat dark overlay (design system — a flat
 * layer, never a gradient).
 *
 * The body is Markdown rendered server-side into sanitized semantic HTML, so
 * the page ships a real document outline: one `h1`, `h2`/`h3` sections with
 * deep-linkable ids, captioned figures, lists and quotes. A `BlogPosting` +
 * `BreadcrumbList` block describes the same structure to crawlers.
 */
export default async function BlogDetailPage({ params }: BlogDetailRouteProps) {
  const { slug } = await params;
  const post = await getBlogBySlug(slug);

  if (!post) notFound();

  const t = await getTranslations("browse.blogs");
  const format = await getFormatter();
  const body = await renderBlogMarkdown(post.content);

  const jsonLd = buildBlogJsonLd({
    post,
    bodyText: body.text,
    wordCount: body.wordCount,
    readingMinutes: body.readingMinutes,
    headings: body.headings,
    bodyImages: body.images.map((image) => image.src),
  });

  // A contents list only earns its space once a post has real sections.
  const showContents = body.headings.length >= 3;
  const modified =
    post.updatedAt.slice(0, 10) !== post.publishedAt.slice(0, 10);

  return (
    <main className="relative flex flex-1 flex-col">
      <JsonLd data={jsonLd} />

      {/* Full-bleed cover background (LIST-05). */}
      <div className="fixed inset-0 -z-10 bg-black">
        {post.coverImage && (
          <Image
            src={post.coverImage}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        )}
        {/* Flat dark overlay for readability — no gradient. */}
        <div className="absolute inset-0 bg-black/80" />
      </div>

      <article
        lang={post.language}
        className="mx-auto w-full max-w-3xl px-4 pt-28 pb-20 sm:px-6 sm:pt-32"
      >
        <Link
          href="/blogs"
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring mb-8 inline-flex items-center gap-2 text-sm font-medium transition-colors outline-none focus-visible:ring-2"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t("backToBlogs")}
        </Link>

        <header className="border-border mb-8 border-b pb-8">
          <p className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-xs tracking-wide uppercase">
            <time dateTime={post.publishedAt}>
              {format.dateTime(new Date(post.publishedAt), {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
            {post.author && <span aria-hidden>·</span>}
            {post.author &&
              (post.authorUrl ? (
                <a
                  href={post.authorUrl}
                  rel="author noopener noreferrer"
                  target="_blank"
                  className="hover:text-foreground transition-colors"
                >
                  {post.author}
                </a>
              ) : (
                <span>{post.author}</span>
              ))}
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" aria-hidden />
              {t("readingTime", { minutes: body.readingMinutes })}
            </span>
          </p>

          <h1 className="text-foreground mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            {post.title}
          </h1>

          {post.excerpt && (
            <p className="text-muted-foreground mt-4 text-lg">{post.excerpt}</p>
          )}

          {post.tags.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <li key={tag.slug}>
                  <Link
                    href={`/blogs/tag/${tag.slug}`}
                    rel="tag"
                    className="border-border text-muted-foreground hover:border-primary hover:text-foreground focus-visible:ring-ring inline-flex border px-2.5 py-1 text-xs font-medium tracking-wide uppercase transition-colors outline-none focus-visible:ring-2"
                  >
                    {tag.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {post.translations.length > 0 && (
            <nav aria-label={t("translations")} className="mt-5">
              <p className="text-muted-foreground mb-2 inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
                <Languages className="size-3.5" aria-hidden />
                {t("translations")}
              </p>
              <ul className="flex flex-wrap gap-2">
                {post.translations.map((sibling) => (
                  <li key={sibling.slug}>
                    {/* A real anchor between versions, not just a meta tag:
                        it is how a reader switches, and it backs the
                        `hreflang` claim with a link a crawler can follow. */}
                    <Link
                      href={`/blogs/${sibling.slug}`}
                      hrefLang={sibling.language}
                      lang={sibling.language}
                      title={sibling.title}
                      className="border-border text-muted-foreground hover:border-primary hover:text-foreground focus-visible:ring-ring inline-flex border px-2.5 py-1 text-xs font-medium transition-colors outline-none focus-visible:ring-2"
                    >
                      {isLocale(sibling.language)
                        ? localeNames[sibling.language]
                        : sibling.language.toUpperCase()}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          {modified && (
            <p className="text-muted-foreground/70 mt-4 text-xs">
              {t("updatedOn", {
                date: format.dateTime(new Date(post.updatedAt), {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }),
              })}
            </p>
          )}
        </header>

        {showContents && (
          <nav
            aria-label={t("tableOfContents")}
            className="border-border mb-10 border p-4 sm:p-5"
          >
            <p className="text-muted-foreground mb-3 inline-flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">
              <List className="size-3.5" aria-hidden />
              {t("tableOfContents")}
            </p>
            <ol className="flex flex-col gap-2 text-sm">
              {body.headings.map((heading) => (
                <li
                  key={heading.id}
                  // Nested headings are indented rather than nested in markup:
                  // a body may legitimately start at h3, and a real nested list
                  // would then open with an empty level.
                  style={{ paddingLeft: `${(heading.level - 2) * 0.875}rem` }}
                >
                  <a
                    href={`#${heading.id}`}
                    className="text-muted-foreground hover:text-primary focus-visible:ring-ring transition-colors outline-none focus-visible:ring-2"
                  >
                    {heading.text}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        {/* Sanitized by the Markdown renderer: raw HTML is parsed and then
            whitelisted there, so nothing executable can reach this point. */}
        <div
          className="blog-prose"
          dangerouslySetInnerHTML={{ __html: body.html }}
        />
      </article>
    </main>
  );
}
