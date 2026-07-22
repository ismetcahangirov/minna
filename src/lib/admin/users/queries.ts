import "server-only";

import { desc } from "drizzle-orm";

import { users } from "@/db/schema";

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: "user" | "admin";
  blocked: boolean;
  createdAt: string;
}

/**
 * All users for the admin table (ADMIN-06), newest first. `createdAt` is an ISO
 * string for a serializable server→client shape. Degrades to an empty list on
 * any DB failure.
 */
export async function listAdminUsers(): Promise<AdminUserRow[]> {
  try {
    const { db } = await import("@/db");
    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
        role: users.role,
        blocked: users.blocked,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    return rows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
    }));
  } catch (error) {
    console.error("[admin] listAdminUsers failed:", (error as Error).message);
    return [];
  }
}
