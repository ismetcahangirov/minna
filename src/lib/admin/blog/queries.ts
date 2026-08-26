import "server-only";

import { desc, eq } from "drizzle-orm";

import {
  blogMedia,
  blogs,
  blogTags,
  blogsToTags,
  type Blog,
  type BlogTag,
} from "@/db/schema";
import type { BlogMediaItem } from "@/lib/admin/blog/media-actions";

/**
 * All blog posts for the admin table (ADMIN-05), newest first — including
 * unpublished drafts, which the public listing hides. `@/db` is imported
 * dynamically to keep `DATABASE_URL` out of the build graph; a failure degrades
 * to an empty list.
 */
export async function listAdminBlogs(): Promise<Blog[]> {
  try {
    const { db } = await import("@/db");
    return await db.select().from(blogs).orderBy(desc(blogs.createdAt));
  } catch (error) {
    console.error("[admin] listAdminBlogs failed:", (error as Error).message);
    return [];
  }
}

/** A single post by id for the edit form, or `null` when it does not exist. */
export async function getAdminBlog(id: string): Promise<Blog | null> {
  const key = id?.trim();
  if (!key) return null;

  try {
    const { db } = await import("@/db");
    const rows = await db
      .select()
      .from(blogs)
      .where(eq(blogs.id, key))
      .limit(1);
    return rows[0] ?? null;
  } catch (error) {
    console.error("[admin] getAdminBlog failed:", (error as Error).message);
    return null;
  }
}

/**
 * The admin image library (ADMIN-05), newest first.
 *
 * Bounded rather than paged: the library is a picker inside a form, and an
 * editor scans it visually. Beyond a few screens of thumbnails the search box
 * is the answer, not another page of scrolling.
 */
export async function listBlogMedia(limit = 120): Promise<BlogMediaItem[]> {
  try {
    const { db } = await import("@/db");
    // Only what the picker renders — the Cloudinary public id stays server-side.
    return await db
      .select({
        id: blogMedia.id,
        url: blogMedia.url,
        alt: blogMedia.alt,
        caption: blogMedia.caption,
        width: blogMedia.width,
        height: blogMedia.height,
      })
      .from(blogMedia)
      .orderBy(desc(blogMedia.createdAt))
      .limit(limit);
  } catch (error) {
    console.error("[admin] listBlogMedia failed:", (error as Error).message);
    return [];
  }
}

/** Tags an admin can attach to a post, alphabetical — including unused ones. */
export async function listAdminBlogTags(): Promise<BlogTag[]> {
  try {
    const { db } = await import("@/db");
    return await db.select().from(blogTags).orderBy(blogTags.name);
  } catch (error) {
    console.error(
      "[admin] listAdminBlogTags failed:",
      (error as Error).message,
    );
    return [];
  }
}

/** The tag names attached to one post, for seeding the edit form's tag field. */
export async function getAdminBlogTagNames(blogId: string): Promise<string[]> {
  try {
    const { db } = await import("@/db");
    const rows = await db
      .select({ name: blogTags.name })
      .from(blogsToTags)
      .innerJoin(blogTags, eq(blogsToTags.tagId, blogTags.id))
      .where(eq(blogsToTags.blogId, blogId))
      .orderBy(blogTags.name);
    return rows.map((row) => row.name);
  } catch (error) {
    console.error(
      "[admin] getAdminBlogTagNames failed:",
      (error as Error).message,
    );
    return [];
  }
}
