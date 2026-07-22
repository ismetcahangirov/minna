import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";

import { stripHtml } from "@/lib/anime/text";
import { getBlogBySlug } from "@/lib/blog/queries";

interface BlogDetailRouteProps {
  params: Promise<{ slug: string }>;
}

/**
 * Dynamic SEO metadata for a blog post (LIST-05): title, description and Open
 * Graph/Twitter cards from the post. Shares nothing extra — a single query.
 */
export async function generateMetadata({
  params,
}: BlogDetailRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogBySlug(slug);

  if (!post) return { title: "Blog not found — Minna" };

  const title = `${post.title} — Minna`;
  const description = (
    post.excerpt ?? stripHtml(post.content).slice(0, 200)
  ).trim();
  const images = post.coverImage
    ? [{ url: post.coverImage, alt: post.title }]
    : [];

  return {
    title,
    description,
    alternates: { canonical: `/blogs/${post.slug}` },
    openGraph: { title, description, type: "article", images },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: images.map((entry) => entry.url),
    },
  };
}

/**
 * Blog detail page (LIST-05). The cover image is a full-bleed fixed background
 * with the article content placed over a flat dark overlay (design system — a
 * flat layer, never a gradient). Server-rendered for SEO; a missing or
 * unpublished slug renders the 404.
 */
export default async function BlogDetailPage({ params }: BlogDetailRouteProps) {
  const { slug } = await params;
  const post = await getBlogBySlug(slug);

  if (!post) notFound();

  const t = await getTranslations("browse.blogs");
  const format = await getFormatter();
  const paragraphs = post.content
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <main className="relative flex flex-1 flex-col">
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

      <article className="mx-auto w-full max-w-3xl px-4 pt-28 pb-20 sm:px-6 sm:pt-32">
        <Link
          href="/blogs"
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring mb-8 inline-flex items-center gap-2 text-sm font-medium transition-colors outline-none focus-visible:ring-2"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t("backToBlogs")}
        </Link>

        <header className="border-border mb-8 border-b pb-8">
          <p className="text-muted-foreground text-xs tracking-wide uppercase">
            <time dateTime={post.publishedAt}>
              {format.dateTime(new Date(post.publishedAt), {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
            {post.author ? ` · ${post.author}` : ""}
          </p>
          <h1 className="text-foreground mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            {post.title}
          </h1>
          {post.excerpt && (
            <p className="text-muted-foreground mt-4 text-lg">{post.excerpt}</p>
          )}
        </header>

        <div className="flex flex-col gap-5 text-base leading-relaxed text-neutral-200">
          {paragraphs.map((block, index) => (
            <p key={index} className="whitespace-pre-line">
              {block}
            </p>
          ))}
        </div>
      </article>
    </main>
  );
}
