import "server-only";

import { cache } from "react";
import { and, count, desc, eq, max, sql } from "drizzle-orm";

import { blogs, blogTags, blogsToTags } from "@/db/schema";
import { BROWSE_PAGE_SIZE, type PagedResult } from "@/lib/browse/types";
import { type BlogSummary, toBlogSummary } from "@/lib/blog/types";

/** A tag as the archive index shows it: label plus how much it covers. */
export interface BlogTagWithCount {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  /** Published posts carrying the tag. Zero-post tags are never listed. */
  postCount: number;
}

/** The archive page's own record, without its posts. */
export interface BlogTagDetail {
  id: string;
  slug: string;
  name: string;
  description: string | null;
}

/**
 * Every tag that has at least one published post, most-used first.
 *
 * Tags with no published post are excluded on purpose: they would link to an
 * empty archive, which reads as thin content and wastes crawl budget.
 */
export const listBlogTags = cache(async (): Promise<BlogTagWithCount[]> => {
  try {
    const { db } = await import("@/db");
    const rows = await db
      .select({
        id: blogTags.id,
        slug: blogTags.slug,
        name: blogTags.name,
        description: blogTags.description,
        postCount: count(blogsToTags.blogId),
      })
      .from(blogTags)
      .innerJoin(blogsToTags, eq(blogsToTags.tagId, blogTags.id))
      .innerJoin(
        blogs,
        and(eq(blogs.id, blogsToTags.blogId), eq(blogs.published, true)),
      )
      .groupBy(blogTags.id)
      .orderBy(desc(count(blogsToTags.blogId)), blogTags.name);

    return rows;
  } catch (error) {
    console.error("[blog] listBlogTags failed:", (error as Error).message);
    return [];
  }
});

/** One tag by slug, or `null` when it does not exist (the archive 404s). */
export const getBlogTagBySlug = cache(
  async (slug: string): Promise<BlogTagDetail | null> => {
    const key = slug?.trim().toLowerCase();
    if (!key) return null;

    try {
      const { db } = await import("@/db");
      const rows = await db
        .select({
          id: blogTags.id,
          slug: blogTags.slug,
          name: blogTags.name,
          description: blogTags.description,
        })
        .from(blogTags)
        .where(eq(blogTags.slug, key))
        .limit(1);

      return rows[0] ?? null;
    } catch (error) {
      console.error(
        "[blog] getBlogTagBySlug failed:",
        (error as Error).message,
      );
      return null;
    }
  },
);

/**
 * One page of published posts carrying a tag, newest first. Tags are not
 * re-attached to these cards — the archive already states the topic, and
 * fetching them again would be a second query for something the page shows.
 */
export const listBlogsByTag = cache(
  async (
    tagId: string,
    page: number = 1,
  ): Promise<PagedResult<BlogSummary>> => {
    const current = Math.max(1, Math.min(Math.floor(page) || 1, 500));

    try {
      const { db } = await import("@/db");
      const rows = await db
        .select({ blog: blogs })
        .from(blogsToTags)
        .innerJoin(blogs, eq(blogs.id, blogsToTags.blogId))
        .where(and(eq(blogsToTags.tagId, tagId), eq(blogs.published, true)))
        .orderBy(desc(blogs.publishedAt))
        .limit(BROWSE_PAGE_SIZE + 1)
        .offset((current - 1) * BROWSE_PAGE_SIZE);

      return {
        items: rows
          .slice(0, BROWSE_PAGE_SIZE)
          .map((row) => toBlogSummary(row.blog)),
        page: current,
        hasNextPage: rows.length > BROWSE_PAGE_SIZE,
      };
    } catch (error) {
      console.error("[blog] listBlogsByTag failed:", (error as Error).message);
      return { items: [], page: current, hasNextPage: false };
    }
  },
);

/** A tag archive's URL and the date of its most recently touched post. */
export interface BlogTagSitemapEntry {
  slug: string;
  updatedAt: Date;
  /** Published posts under the tag, so the sitemap can weight its priority. */
  postCount: number;
}

/**
 * Every tag archive worth crawling, for `sitemap.xml` (PERF-01).
 *
 * `lastModified` is the newest `updated_at` among the tag's published posts —
 * an archive changes exactly when one of its posts does, so a tag row's own
 * `created_at` would tell a crawler to stop re-checking a page that is still
 * moving. Empty tags are excluded along with the rest.
 */
export async function listBlogTagSitemapEntries(): Promise<
  BlogTagSitemapEntry[]
> {
  try {
    const { db } = await import("@/db");
    const rows = await db
      .select({
        slug: blogTags.slug,
        updatedAt: max(blogs.updatedAt),
        postCount: count(blogs.id),
      })
      .from(blogTags)
      .innerJoin(blogsToTags, eq(blogsToTags.tagId, blogTags.id))
      .innerJoin(
        blogs,
        and(eq(blogs.id, blogsToTags.blogId), eq(blogs.published, true)),
      )
      .groupBy(blogTags.id)
      .orderBy(desc(sql`max(${blogs.updatedAt})`))
      .limit(10_000);

    return rows.map((row) => ({
      slug: row.slug,
      updatedAt: row.updatedAt ?? new Date(),
      postCount: row.postCount,
    }));
  } catch (error) {
    console.error(
      "[blog] listBlogTagSitemapEntries failed:",
      (error as Error).message,
    );
    return [];
  }
}
