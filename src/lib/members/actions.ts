"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";

export interface VisibilityResult {
  ok: boolean;
  libraryPublic?: boolean;
  /** True when the action failed because the member is not signed in. */
  unauthorized?: boolean;
}

/**
 * Opens or closes the member's library to other members (MEM-04).
 *
 * The directory itself always lists a member — that is what makes people
 * findable — but what their profile shows is theirs to decide, so a closed
 * library renders as a private notice instead of its shelves.
 */
export async function setLibraryVisibility(
  isPublic: boolean,
): Promise<VisibilityResult> {
  const user = await getCurrentUser();
  if (!user?.id) return { ok: false, unauthorized: true };

  try {
    const { db } = await import("@/db");
    await db
      .update(users)
      .set({ libraryPublic: isPublic })
      .where(eq(users.id, user.id));

    revalidatePath("/profile");
    revalidatePath("/library");
    return { ok: true, libraryPublic: isPublic };
  } catch (error) {
    console.error(
      "[members] setLibraryVisibility failed:",
      (error as Error).message,
    );
    return { ok: false };
  }
}
