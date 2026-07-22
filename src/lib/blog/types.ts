import type { Blog } from "@/db/schema";

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
  author: string | null;
  publishedAt: string;
}

/** Full post backing the blog detail page (LIST-05) — adds the body content. */
export interface BlogDetail extends BlogSummary {
  content: string;
}

/** Narrows a DB row to the card {@link BlogSummary} (drops the body/content). */
export function toBlogSummary(row: Blog): BlogSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    coverImage: row.coverImage,
    author: row.author,
    publishedAt: row.publishedAt.toISOString(),
  };
}

/** Narrows a DB row to the full {@link BlogDetail} (includes the body). */
export function toBlogDetail(row: Blog): BlogDetail {
  return { ...toBlogSummary(row), content: row.content };
}
