import type { Blog } from "@/db/schema";

/** One other language this article exists in. */
export interface BlogTranslationRef {
  slug: string;
  /** BCP-47 tag, used for `hreflang` and the switcher's label. */
  language: string;
  title: string;
}

/** A topic label carried by a post, and the archive page it links to. */
export interface BlogTagRef {
  slug: string;
  name: string;
}

/**
 * Blog fields shown on a listing card (LIST-03). `publishedAt` is an ISO string
 * (not a `Date`) so the SSR-seeded first page and the JSON pagination API share
 * one serializable shape across the server/client boundary.
 */
export interface BlogSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImage: string | null;
  /** Alt text for {@link coverImage}; the title stands in when it is empty. */
  coverImageAlt: string | null;
  author: string | null;
  publishedAt: string;
  /** Empty until an editor tags the post; drives the tag archive pages. */
  tags: BlogTagRef[];
}

/**
 * Full post backing the blog detail page (LIST-05) — adds the Markdown body and
 * the authorship/language fields only the article's structured data reads.
 */
export interface BlogDetail extends BlogSummary {
  /** Markdown; see {@link import("@/lib/blog/markdown").renderBlogMarkdown}. */
  content: string;
  /** Author profile/homepage, published as `Person.url` (E-E-A-T). */
  authorUrl: string | null;
  /** BCP-47 language of the body, published as `inLanguage`. */
  language: string;
  /** Drives `dateModified`, distinct from the (backdatable) publish date. */
  updatedAt: string;
  /** Groups this post with its translations; see `blogs.translationGroupId`. */
  translationGroupId: string;
  /**
   * Published siblings in other languages, excluding this post. Empty when the
   * article has not been translated — the common case, and the one where no
   * `hreflang` should be emitted at all.
   */
  translations: BlogTranslationRef[];
}

/** Narrows a DB row to the card {@link BlogSummary} (drops the body/content). */
export function toBlogSummary(row: Blog, tags: BlogTagRef[] = []): BlogSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    coverImage: row.coverImage,
    coverImageAlt: row.coverImageAlt,
    author: row.author,
    publishedAt: row.publishedAt.toISOString(),
    tags,
  };
}

/** Narrows a DB row to the full {@link BlogDetail} (includes the body). */
export function toBlogDetail(
  row: Blog,
  tags: BlogTagRef[] = [],
  translations: BlogTranslationRef[] = [],
): BlogDetail {
  return {
    ...toBlogSummary(row, tags),
    content: row.content,
    authorUrl: row.authorUrl,
    language: row.language,
    updatedAt: row.updatedAt.toISOString(),
    translationGroupId: row.translationGroupId,
    translations,
  };
}
