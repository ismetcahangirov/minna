"use server";

import { and, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { blogs, blogTags, blogsToTags } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/admin";

type BlogField =
  "title" | "slug" | "content" | "coverImage" | "authorUrl" | "language";

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
  coverImageAlt: string | null;
  author: string | null;
  authorUrl: string | null;
  language: string;
  published: boolean;
}

/** Languages a post may be authored in — the locales the UI itself ships. */
const LANGUAGES = ["en", "tr", "ru"] as const;

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
  const coverImageAlt = String(formData.get("coverImageAlt") ?? "").trim();
  const author = String(formData.get("author") ?? "").trim();
  const authorUrl = String(formData.get("authorUrl") ?? "").trim();
  const language = String(formData.get("language") ?? "en").trim();
  const published = formData.get("published") != null;

  if (!title || title.length > 200) fieldErrors.title = "required";
  if (!content) fieldErrors.content = "required";
  if (coverImage && !isHttpUrl(coverImage))
    fieldErrors.coverImage = "invalidUrl";
  if (authorUrl && !isHttpUrl(authorUrl)) fieldErrors.authorUrl = "invalidUrl";
  if (!(LANGUAGES as readonly string[]).includes(language)) {
    fieldErrors.language = "invalidLanguage";
  }

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
      coverImageAlt: coverImageAlt || null,
      author: author || null,
      authorUrl: authorUrl || null,
      language,
      published,
    },
  };
}

/**
 * Parses the comma-separated tag field into distinct display names.
 *
 * Names are kept as the editor typed them — the slug is what identifies a tag,
 * so "Shonen" and "shonen" are the same topic and the first spelling to reach
 * the table is the one the archive shows.
 */
function parseTagNames(formData: FormData): string[] {
  const seen = new Set<string>();
  const names: string[] = [];

  for (const raw of String(formData.get("tags") ?? "").split(",")) {
    const name = raw.trim().replace(/\s+/g, " ").slice(0, 60);
    if (!name) continue;
    const slug = slugify(name);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    names.push(name);
  }

  // A post about everything is about nothing, and each tag is an indexed page.
  return names.slice(0, 12);
}

/**
 * Makes a post's tag links exactly match `names`, creating tags as needed.
 *
 * Links are replaced wholesale rather than diffed: a post carries a handful of
 * tags, so the delete-then-insert is one round trip either way and cannot leave
 * a stale link behind. Tags themselves are never deleted — an archive URL that
 * has been crawled must not start 404ing because the last post dropped its tag.
 */
async function syncBlogTags(
  db: Awaited<typeof import("@/db")>["db"],
  blogId: string,
  names: string[],
): Promise<void> {
  await db.delete(blogsToTags).where(eq(blogsToTags.blogId, blogId));
  if (names.length === 0) return;

  const rows = await db
    .insert(blogTags)
    .values(names.map((name) => ({ slug: slugify(name), name })))
    .onConflictDoUpdate({
      target: blogTags.slug,
      // A no-op write to the conflict key itself. `onConflictDoNothing` would
      // omit already-existing tags from `returning()`, leaving their links
      // unwritten; re-writing the slug brings every row back while leaving the
      // display name the archive already shows untouched.
      set: { slug: sql`excluded.slug` },
    })
    .returning({ id: blogTags.id });

  await db
    .insert(blogsToTags)
    .values(rows.map((row) => ({ blogId, tagId: row.id })))
    .onConflictDoNothing();
}

/**
 * Refreshes every public surface a post appears on.
 *
 * Tag archives are revalidated by route rather than by slug: retagging a post
 * changes the archives it left as well as the ones it joined, and the ones it
 * left are exactly the slugs no longer available to enumerate.
 */
function revalidateBlogPaths(slug: string, previousSlug?: string): void {
  revalidatePath("/blogs");
  revalidatePath(`/blogs/${slug}`);
  if (previousSlug && previousSlug !== slug) {
    revalidatePath(`/blogs/${previousSlug}`);
  }
  revalidatePath("/blogs/tag/[slug]", "page");
  revalidatePath("/admin/blogs");
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
    const [created] = await db
      .insert(blogs)
      .values(parsed.values)
      .returning({ id: blogs.id });
    await syncBlogTags(db, created.id, parseTagNames(formData));
  } catch (error) {
    console.error("[admin] createBlog failed:", (error as Error).message);
    return { error: "saveFailed" };
  }

  revalidateBlogPaths(parsed.values.slug);
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
    await syncBlogTags(db, id, parseTagNames(formData));
  } catch (error) {
    console.error("[admin] updateBlog failed:", (error as Error).message);
    return { error: "saveFailed" };
  }

  revalidateBlogPaths(parsed.values.slug, previousSlug);
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

  revalidateBlogPaths(slug);
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

  revalidateBlogPaths(slug);
}
