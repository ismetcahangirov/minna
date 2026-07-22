import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { blogs } from "@/db/schema";
import { BROWSE_PAGE_SIZE, type PagedResult } from "@/lib/browse/types";
import {
  type BlogDetail,
  type BlogSummary,
  toBlogDetail,
  toBlogSummary,
} from "@/lib/blog/types";

/** Guards the query against absurd deep-link pages. */
const MAX_PAGE = 500;

function safePage(page: number | undefined): number {
  if (!Number.isFinite(page) || (page as number) < 1) return 1;
  return Math.min(Math.floor(page as number), MAX_PAGE);
}

/**
 * One page of published blog posts, newest first (LIST-03).
 *
 * Fetches `BROWSE_PAGE_SIZE + 1` rows so `hasNextPage` is known without a second
 * count query. `@/db` is imported dynamically so its `DATABASE_URL` requirement
 * stays out of the build-time module graph (matching the favorites/auth layers).
 * Any failure — including an unconfigured database — degrades to an empty page
 * rather than breaking the render, consistent with the anime data layer.
 */
export async function listBlogs(
  page: number = 1,
): Promise<PagedResult<BlogSummary>> {
  const current = safePage(page);

  try {
    const { db } = await import("@/db");
    const rows = await db
      .select()
      .from(blogs)
      .where(eq(blogs.published, true))
      .orderBy(desc(blogs.publishedAt))
      .limit(BROWSE_PAGE_SIZE + 1)
      .offset((current - 1) * BROWSE_PAGE_SIZE);

    const hasNextPage = rows.length > BROWSE_PAGE_SIZE;
    const items = rows.slice(0, BROWSE_PAGE_SIZE).map(toBlogSummary);

    return { items, page: current, hasNextPage };
  } catch (error) {
    console.error("[blog] listBlogs failed:", (error as Error).message);
    return { items: [], page: current, hasNextPage: false };
  }
}

/**
 * A single published post by slug (LIST-05), or `null` when it does not exist
 * (the detail page treats that as a 404). Degrades to `null` on any DB failure.
 */
export async function getBlogBySlug(slug: string): Promise<BlogDetail | null> {
  const key = slug?.trim();
  if (!key) return null;

  try {
    const { db } = await import("@/db");
    const rows = await db
      .select()
      .from(blogs)
      .where(and(eq(blogs.slug, key), eq(blogs.published, true)))
      .limit(1);

    return rows.length > 0 ? toBlogDetail(rows[0]) : null;
  } catch (error) {
    console.error("[blog] getBlogBySlug failed:", (error as Error).message);
    return null;
  }
}
