"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { blogs } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/admin";

type BlogField = "title" | "slug" | "content" | "coverImage";

export interface BlogFormState {
  error?: string;
  fieldErrors?: Partial<Record<BlogField, string>>;
}

interface BlogValues {
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  coverImage: string | null;
  author: string | null;
  published: boolean;
}

/** URL-safe slug from arbitrary text; empty when the input has no ASCII words
 * (e.g. a fully Cyrillic title), in which case the admin must supply one. */
function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function parseBlog(
  formData: FormData,
): { values: BlogValues } | { fieldErrors: BlogFormState["fieldErrors"] } {
  const fieldErrors: NonNullable<BlogFormState["fieldErrors"]> = {};

  const title = String(formData.get("title") ?? "").trim();
  const slugRaw = String(formData.get("slug") ?? "").trim();
  const excerpt = String(formData.get("excerpt") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const coverImage = String(formData.get("coverImage") ?? "").trim();
  const author = String(formData.get("author") ?? "").trim();
  const published = formData.get("published") != null;

  if (!title || title.length > 200) fieldErrors.title = "required";
  if (!content) fieldErrors.content = "required";
  if (coverImage && !isHttpUrl(coverImage))
    fieldErrors.coverImage = "invalidUrl";

  const slug = slugRaw ? slugify(slugRaw) : slugify(title);
  if (!slug || !SLUG_PATTERN.test(slug)) fieldErrors.slug = "invalidSlug";

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  return {
    values: {
      title,
      slug,
      excerpt: excerpt || null,
      content,
      coverImage: coverImage || null,
      author: author || null,
      published,
    },
  };
}

/** Ensures the slug is free (excluding the row being edited). */
async function slugTaken(
  db: Awaited<typeof import("@/db")>["db"],
  slug: string,
  excludeId?: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: blogs.id })
    .from(blogs)
    .where(
      excludeId
        ? and(eq(blogs.slug, slug), ne(blogs.id, excludeId))
        : eq(blogs.slug, slug),
    )
    .limit(1);
  return rows.length > 0;
}

/** Creates a blog post (ADMIN-05), then returns to the list. */
export async function createBlogAction(
  _prev: BlogFormState,
  formData: FormData,
): Promise<BlogFormState> {
  await requireAdmin();

  const parsed = parseBlog(formData);
  if ("fieldErrors" in parsed) return { fieldErrors: parsed.fieldErrors };

  try {
    const { db } = await import("@/db");
    if (await slugTaken(db, parsed.values.slug)) {
      return { fieldErrors: { slug: "slugTaken" } };
    }
    await db.insert(blogs).values(parsed.values);
  } catch (error) {
    console.error("[admin] createBlog failed:", (error as Error).message);
    return { error: "saveFailed" };
  }

  revalidatePath("/blogs");
  revalidatePath(`/blogs/${parsed.values.slug}`);
  revalidatePath("/admin/blogs");
  redirect("/admin/blogs");
}

/** Updates a post (id bound by the edit page), then returns to the list. */
export async function updateBlogAction(
  id: string,
  previousSlug: string,
  _prev: BlogFormState,
  formData: FormData,
): Promise<BlogFormState> {
  await requireAdmin();

  const parsed = parseBlog(formData);
  if ("fieldErrors" in parsed) return { fieldErrors: parsed.fieldErrors };

  try {
    const { db } = await import("@/db");
    if (await slugTaken(db, parsed.values.slug, id)) {
      return { fieldErrors: { slug: "slugTaken" } };
    }
    await db.update(blogs).set(parsed.values).where(eq(blogs.id, id));
  } catch (error) {
    console.error("[admin] updateBlog failed:", (error as Error).message);
    return { error: "saveFailed" };
  }

  revalidatePath("/blogs");
  revalidatePath(`/blogs/${previousSlug}`);
  revalidatePath(`/blogs/${parsed.values.slug}`);
  revalidatePath("/admin/blogs");
  redirect("/admin/blogs");
}

/** Deletes a post (id/slug bound per row). */
export async function deleteBlogAction(
  id: string,
  slug: string,
): Promise<void> {
  await requireAdmin();

  try {
    const { db } = await import("@/db");
    await db.delete(blogs).where(eq(blogs.id, id));
  } catch (error) {
    console.error("[admin] deleteBlog failed:", (error as Error).message);
  }

  revalidatePath("/blogs");
  revalidatePath(`/blogs/${slug}`);
  revalidatePath("/admin/blogs");
}

/** Publishes/unpublishes a post inline from the list. */
export async function setBlogPublishedAction(
  id: string,
  slug: string,
  published: boolean,
): Promise<void> {
  await requireAdmin();

  try {
    const { db } = await import("@/db");
    await db.update(blogs).set({ published }).where(eq(blogs.id, id));
  } catch (error) {
    console.error("[admin] setBlogPublished failed:", (error as Error).message);
  }

  revalidatePath("/blogs");
  revalidatePath(`/blogs/${slug}`);
  revalidatePath("/admin/blogs");
}
