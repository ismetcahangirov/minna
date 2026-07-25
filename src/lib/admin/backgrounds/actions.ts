"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { backgroundVideos } from "@/db/schema";
import {
  CloudinaryConfigError,
  uploadBackgroundVideoAsWebp,
} from "@/lib/admin/backgrounds/cloudinary";
import { VIDEO_CONSTRAINTS } from "@/lib/admin/video/constraints";
import { requireAdmin } from "@/lib/auth/admin";
import {
  isBackgroundPage,
  isBackgroundVariant,
  type BackgroundPage,
  type BackgroundVariant,
} from "@/lib/backgrounds/config";
import { invalidateBackground } from "@/lib/backgrounds/queries";

/**
 * Result of a background set attempt for `useActionState`. `error` is an i18n
 * key (`admin.backgrounds.errors.*`, including the ADMIN-03 validation codes);
 * `ok` signals a saved override. The form stays in place — unlike ads there is
 * no redirect — so each slot shows its own inline feedback.
 */
export interface BackgroundFormState {
  ok?: boolean;
  error?: string;
}

function guard(page: string, variant: string): boolean {
  return isBackgroundPage(page) && isBackgroundVariant(variant);
}

/**
 * Uploads, converts, and sets a page/variant background override (ADMIN-04).
 * The original file never becomes a public application asset: only its animated
 * WebP Cloudinary derivative is stored. Defaults remain untouched.
 */
export async function setBackgroundVideoAction(
  page: BackgroundPage,
  variant: BackgroundVariant,
  _prev: BackgroundFormState,
  formData: FormData,
): Promise<BackgroundFormState> {
  await requireAdmin();
  if (!guard(page, variant)) return { error: "saveFailed" };

  const uploaded = formData.get("video");
  if (!(uploaded instanceof File) || uploaded.size === 0) {
    return { error: "required" };
  }
  if (uploaded.type && !uploaded.type.startsWith("video/")) {
    return { error: "invalidFile" };
  }
  if (uploaded.size > VIDEO_CONSTRAINTS.maxSizeBytes) {
    return { error: "tooLarge" };
  }

  try {
    const url = await uploadBackgroundVideoAsWebp(uploaded, page, variant);
    const { db } = await import("@/db");
    await db
      .insert(backgroundVideos)
      .values({ page, variant, videoUrl: url, active: true })
      .onConflictDoUpdate({
        target: [backgroundVideos.page, backgroundVideos.variant],
        set: { videoUrl: url, active: true, updatedAt: new Date() },
      });
  } catch (error) {
    if (error instanceof CloudinaryConfigError) {
      return { error: "cloudinaryMissing" };
    }
    console.error("[admin] setBackground failed:", (error as Error).message);
    return { error: "uploadFailed" };
  }

  await invalidateBackground(page);
  revalidatePath("/admin/backgrounds");
  return { ok: true };
}

/**
 * Removes an override so the page falls back to its built-in default (ADMIN-04).
 * The default lives in code and is never touched, so it can't be destroyed.
 */
export async function clearBackgroundVideoAction(
  page: BackgroundPage,
  variant: BackgroundVariant,
): Promise<void> {
  await requireAdmin();
  if (!guard(page, variant)) return;

  try {
    const { db } = await import("@/db");
    await db
      .delete(backgroundVideos)
      .where(
        and(
          eq(backgroundVideos.page, page),
          eq(backgroundVideos.variant, variant),
        ),
      );
  } catch (error) {
    console.error("[admin] clearBackground failed:", (error as Error).message);
  }

  await invalidateBackground(page);
  revalidatePath("/admin/backgrounds");
}

/** Enables/disables an override without deleting it (falls back to default while off). */
export async function setBackgroundActiveAction(
  page: BackgroundPage,
  variant: BackgroundVariant,
  active: boolean,
): Promise<void> {
  await requireAdmin();
  if (!guard(page, variant)) return;

  try {
    const { db } = await import("@/db");
    await db
      .update(backgroundVideos)
      .set({ active })
      .where(
        and(
          eq(backgroundVideos.page, page),
          eq(backgroundVideos.variant, variant),
        ),
      );
  } catch (error) {
    console.error(
      "[admin] setBackgroundActive failed:",
      (error as Error).message,
    );
  }

  await invalidateBackground(page);
  revalidatePath("/admin/backgrounds");
}
