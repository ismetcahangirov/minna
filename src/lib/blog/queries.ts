import "server-only";

import { cache } from "react";
import { and, desc, eq, getTableColumns, inArray, ne, sql } from "drizzle-orm";

import { blogs, blogTags, blogsToTags } from "@/db/schema";
import { defaultLocale, type Locale } from "@/i18n/config";
import { BROWSE_PAGE_SIZE, type PagedResult } from "@/lib/browse/types";
import {
  type BlogDetail,
  type BlogSummary,
  type BlogTagRef,
  type BlogTranslationRef,
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
 * One row per translation group, ranked so the reader's language wins.
 *
 * A listing that showed every row would print the same article once per
 * language it exists in. Ranking picks the reader's language first, the site
 * default second, and anything else last, so a group always contributes
 * exactly one card and never an empty slot.
 *
 * The ranking locale is the one in the URL, so `/blogs` and `/tr/blogs` are two
 * listings with two stable selections rather than one listing that changes
 * under a cookie. A crawler therefore sees the same page a reader at that URL
 * does, and each version can be indexed on its own.
 *
 * The selection is per reader, not per article: a group whose only published
 * version is Turkish still appears on `/blogs`, because an English reader
 * should be offered the article rather than an emptier blog. The card links to
 * that version's own URL — `/tr/blogs/…` — since that is the only place it
 * exists. See `@/lib/blog/href`.
 */
function preferredPerGroup(locale: Locale) {
  return sql<number>`row_number() over (
    partition by ${blogs.translationGroupId}
    order by case ${blogs.language}
      when ${locale} then 0
      when ${defaultLocale} then 1
      else 2
    end, ${blogs.publishedAt} desc
  )`;
}

/**
 * Tags of several posts at once, keyed by post id.
 *
 * One `IN` query for a whole page rather than one per card: tags are shown on
 * every listing card, so the per-row alternative is a query per post.
 */
async function tagsByBlogId(
  db: Awaited<typeof import("@/db")>["db"],
  blogIds: string[],
): Promise<Map<string, BlogTagRef[]>> {
  const byId = new Map<string, BlogTagRef[]>();
  if (blogIds.length === 0) return byId;

  const rows = await db
    .select({
      blogId: blogsToTags.blogId,
      slug: blogTags.slug,
      name: blogTags.name,
    })
    .from(blogsToTags)
    .innerJoin(blogTags, eq(blogsToTags.tagId, blogTags.id))
    .where(inArray(blogsToTags.blogId, blogIds))
    .orderBy(blogTags.name);

  for (const row of rows) {
    const list = byId.get(row.blogId) ?? [];
    list.push({ slug: row.slug, name: row.name });
    byId.set(row.blogId, list);
  }
  return byId;
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
  locale: Locale = defaultLocale,
): Promise<PagedResult<BlogSummary>> {
  const current = safePage(page);

  try {
    const { db } = await import("@/db");
    const ranked = db
      .select({
        ...getTableColumns(blogs),
        groupRank: preferredPerGroup(locale).as("group_rank"),
      })
      .from(blogs)
      .where(eq(blogs.published, true))
      .as("ranked");

    const rows = await db
      .select()
      .from(ranked)
      .where(eq(ranked.groupRank, 1))
      .orderBy(desc(ranked.publishedAt))
      .limit(BROWSE_PAGE_SIZE + 1)
      .offset((current - 1) * BROWSE_PAGE_SIZE);

    const hasNextPage = rows.length > BROWSE_PAGE_SIZE;
    const pageRows = rows.slice(0, BROWSE_PAGE_SIZE);
    const tags = await tagsByBlogId(
      db,
      pageRows.map((row) => row.id),
    );
    const items = pageRows.map((row) =>
      toBlogSummary(row, tags.get(row.id) ?? []),
    );

    return { items, page: current, hasNextPage };
  } catch (error) {
    console.error("[blog] listBlogs failed:", (error as Error).message);
    return { items: [], page: current, hasNextPage: false };
  }
}

/**
 * The published translations of one post, excluding the post itself.
 *
 * Only published rows count: `hreflang` must point at pages a visitor can
 * actually reach, and advertising a draft would send Google to a 404 and
 * invalidate the reciprocal set it belongs to.
 */
async function translationsOf(
  db: Awaited<typeof import("@/db")>["db"],
  groupId: string,
  selfId: string,
): Promise<BlogTranslationRef[]> {
  const rows = await db
    .select({
      slug: blogs.slug,
      language: blogs.language,
      title: blogs.title,
    })
    .from(blogs)
    .where(
      and(
        eq(blogs.translationGroupId, groupId),
        ne(blogs.id, selfId),
        eq(blogs.published, true),
      ),
    )
    .orderBy(blogs.language);

  return rows;
}

/**
 * A single published post by slug (LIST-05), or `null` when it does not exist
 * (the detail page treats that as a 404). Degrades to `null` on any DB failure.
 *
 * Memoized per request: the detail page and its `generateMetadata` both need
 * the post, and without this they would each run the query.
 */
export const getBlogBySlug = cache(
  async (slug: string): Promise<BlogDetail | null> => {
    const key = slug?.trim();
    if (!key) return null;

    try {
      const { db } = await import("@/db");
      const rows = await db
        .select()
        .from(blogs)
        .where(and(eq(blogs.slug, key), eq(blogs.published, true)))
        .limit(1);

      if (rows.length === 0) return null;
      const [row] = rows;
      const [tags, translations] = await Promise.all([
        tagsByBlogId(db, [row.id]),
        translationsOf(db, row.translationGroupId, row.id),
      ]);
      return toBlogDetail(row, tags.get(row.id) ?? [], translations);
    } catch (error) {
      console.error("[blog] getBlogBySlug failed:", (error as Error).message);
      return null;
    }
  },
);

/** A published post's slug and last-modified date, for the sitemap (PERF-01). */
export interface BlogSitemapEntry {
  slug: string;
  updatedAt: Date;
  /** BCP-47 tag, so the sitemap entry can carry `xhtml:link` alternates. */
  language: string;
  /** Which posts are translations of one another. */
  translationGroupId: string;
}

/**
 * Slugs of every published post, newest first, for `sitemap.xml` (PERF-01).
 * Capped at Google's per-sitemap URL limit and degrades to an empty list on
 * any DB failure so the sitemap route always renders.
 */
export async function listBlogSitemapEntries(): Promise<BlogSitemapEntry[]> {
  try {
    const { db } = await import("@/db");
    const rows = await db
      .select({
        slug: blogs.slug,
        updatedAt: blogs.updatedAt,
        language: blogs.language,
        translationGroupId: blogs.translationGroupId,
      })
      .from(blogs)
      .where(eq(blogs.published, true))
      .orderBy(desc(blogs.publishedAt))
      .limit(50_000);

    return rows;
  } catch (error) {
    console.error(
      "[blog] listBlogSitemapEntries failed:",
      (error as Error).message,
    );
    return [];
  }
}
