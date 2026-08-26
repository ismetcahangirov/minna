"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { blogMedia } from "@/db/schema";
import {
  ALLOWED_BLOG_IMAGE_TYPES,
  BlogImageConfigError,
  deleteBlogImage,
  MAX_BLOG_IMAGE_BYTES,
  uploadBlogImage,
} from "@/lib/admin/blog/cloudinary";
import { requireAdmin } from "@/lib/auth/admin";

/** What the picker needs to write an image into the body. */
export interface BlogMediaItem {
  id: string;
  url: string;
  alt: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
}

/**
 * Result of an add-image attempt for `useActionState`. `error` is an i18n key
 * under `admin.blogs.media.errors.*`; `added` carries the row so the editor can
 * insert it at the cursor without waiting for a refresh.
 */
export interface BlogMediaFormState {
  added?: BlogMediaItem;
  error?: string;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Stores one image in the library and hands it back.
 *
 * `url` is unique, so re-adding a link the library already holds updates its
 * description instead of creating a duplicate the editor would have to pick
 * between.
 */
async function saveMedia(values: {
  url: string;
  alt: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
  source: "upload" | "link";
  publicId: string | null;
}): Promise<BlogMediaItem> {
  const { db } = await import("@/db");
  const [row] = await db
    .insert(blogMedia)
    .values(values)
    .onConflictDoUpdate({
      target: blogMedia.url,
      set: { alt: values.alt, caption: values.caption },
    })
    .returning();

  return {
    id: row.id,
    url: row.url,
    alt: row.alt,
    caption: row.caption,
    width: row.width,
    height: row.height,
  };
}

/**
 * Uploads an image file into the library (ADMIN-05).
 *
 * Type and size are checked before the network round trip; SVG is refused
 * outright because it can carry script and these files are served from a
 * Cloudinary URL the sanitizer never sees.
 */
export async function uploadBlogImageAction(
  _prev: BlogMediaFormState,
  formData: FormData,
): Promise<BlogMediaFormState> {
  await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "required" };
  if (
    !(ALLOWED_BLOG_IMAGE_TYPES as readonly string[]).includes(file.type) ||
    !file.type.startsWith("image/")
  ) {
    return { error: "invalidFile" };
  }
  if (file.size > MAX_BLOG_IMAGE_BYTES) return { error: "tooLarge" };

  try {
    const uploaded = await uploadBlogImage(file);
    const added = await saveMedia({
      url: uploaded.url,
      alt: String(formData.get("alt") ?? "").trim() || null,
      caption: String(formData.get("caption") ?? "").trim() || null,
      width: uploaded.width,
      height: uploaded.height,
      source: "upload",
      publicId: uploaded.publicId,
    });

    revalidatePath("/admin/blogs");
    return { added };
  } catch (error) {
    if (error instanceof BlogImageConfigError) {
      return { error: "cloudinaryMissing" };
    }
    console.error("[admin] uploadBlogImage failed:", (error as Error).message);
    return { error: "uploadFailed" };
  }
}

/**
 * Adds an image the editor already has a URL for. Nothing is fetched or copied:
 * the remote host keeps serving it, and `source: "link"` records that the app
 * does not own the file and must never try to delete it.
 */
export async function addBlogImageLinkAction(
  _prev: BlogMediaFormState,
  formData: FormData,
): Promise<BlogMediaFormState> {
  await requireAdmin();

  const url = String(formData.get("url") ?? "").trim();
  if (!url) return { error: "required" };
  if (!isHttpUrl(url)) return { error: "invalidUrl" };

  try {
    const added = await saveMedia({
      url,
      alt: String(formData.get("alt") ?? "").trim() || null,
      caption: String(formData.get("caption") ?? "").trim() || null,
      width: null,
      height: null,
      source: "link",
      publicId: null,
    });

    revalidatePath("/admin/blogs");
    return { added };
  } catch (error) {
    console.error("[admin] addBlogImageLink failed:", (error as Error).message);
    return { error: "saveFailed" };
  }
}

/**
 * Removes an image from the library, and the Cloudinary asset behind it when
 * the app is the one that uploaded it.
 *
 * Posts already referencing the URL keep rendering it — a body embeds the URL,
 * not the row — so removing a library entry is only ever a tidy-up of the
 * picker, never an edit to published content.
 */
export async function deleteBlogMediaAction(id: string): Promise<void> {
  await requireAdmin();

  try {
    const { db } = await import("@/db");
    const [row] = await db
      .delete(blogMedia)
      .where(eq(blogMedia.id, id))
      .returning();

    if (row?.source === "upload" && row.publicId) {
      await deleteBlogImage(row.publicId);
    }
  } catch (error) {
    console.error("[admin] deleteBlogMedia failed:", (error as Error).message);
  }

  revalidatePath("/admin/blogs");
}
