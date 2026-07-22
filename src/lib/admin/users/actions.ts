"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/admin";

/**
 * Blocks or unblocks a user (ADMIN-06). A blocked user can't open a new session
 * (enforced in the Auth.js sign-in flow). An admin can't block themselves, which
 * would otherwise be a foot-gun that locks them out on next login.
 */
export async function setUserBlockedAction(
  id: string,
  blocked: boolean,
): Promise<void> {
  const admin = await requireAdmin();
  if (admin.id === id) return;

  try {
    const { db } = await import("@/db");
    await db.update(users).set({ blocked }).where(eq(users.id, id));
  } catch (error) {
    console.error("[admin] setUserBlocked failed:", (error as Error).message);
  }

  revalidatePath("/admin/users");
}

/**
 * Deletes a user and their data (favorites / watch history cascade via FK).
 * Self-deletion is refused so an admin can't remove their own account here.
 */
export async function deleteUserAction(id: string): Promise<void> {
  const admin = await requireAdmin();
  if (admin.id === id) return;

  try {
    const { db } = await import("@/db");
    await db.delete(users).where(eq(users.id, id));
  } catch (error) {
    console.error("[admin] deleteUser failed:", (error as Error).message);
  }

  revalidatePath("/admin/users");
}
