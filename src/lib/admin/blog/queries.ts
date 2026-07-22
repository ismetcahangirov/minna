import "server-only";

import { desc, eq } from "drizzle-orm";

import { blogs, type Blog } from "@/db/schema";

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
