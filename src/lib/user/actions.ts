"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";

/** Bounds for the editable display name (PROFILE-01). */
const NAME_MIN = 1;
const NAME_MAX = 60;

/**
 * Result of {@link updateProfile}, shaped for `useActionState`. `error` is a
 * stable code (not a message) so the client owns the localized copy (EN/TR/RU).
 */
export interface UpdateProfileState {
  status: "idle" | "success" | "error";
  error?: "empty" | "tooLong" | "unauthorized" | "failed";
  /** Echoes the saved name so the form can reflect it without a session read. */
  name?: string;
}

/**
 * Updates the signed-in user's display name (PROFILE-01). Email is the Google
 * identity and the avatar comes from Google, so only the name is user-editable.
 *
 * Auth-guarded and validated; on success it revalidates `/profile` so the
 * server-rendered view (which reads the DB, not the JWT) shows the new name at
 * once. `@/db` is imported dynamically to keep `DATABASE_URL` out of the build
 * graph. Progressive-enhancement friendly: shaped for `useActionState`.
 */
export async function updateProfile(
  _prevState: UpdateProfileState,
  formData: FormData,
): Promise<UpdateProfileState> {
  const user = await getCurrentUser();
  if (!user?.id) return { status: "error", error: "unauthorized" };

  const name = String(formData.get("name") ?? "").trim();
  if (name.length < NAME_MIN) return { status: "error", error: "empty" };
  if (name.length > NAME_MAX) return { status: "error", error: "tooLong" };

  try {
    const { db } = await import("@/db");
    await db.update(users).set({ name }).where(eq(users.id, user.id));

    revalidatePath("/profile");
    return { status: "success", name };
  } catch (error) {
    console.error("[user] updateProfile failed:", (error as Error).message);
    return { status: "error", error: "failed" };
  }
}
