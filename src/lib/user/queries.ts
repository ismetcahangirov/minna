import "server-only";

import { eq } from "drizzle-orm";

import { users } from "@/db/schema";

/**
 * The current user's editable profile, read straight from Neon (PROFILE-01).
 *
 * The profile page reads this rather than the session so an edit is reflected
 * immediately — the JWT session still carries the name captured at login until
 * the token refreshes. `createdAt` is an ISO string for a serializable
 * server→client shape (the "member since" line).
 */
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: "user" | "admin";
  createdAt: string;
}

/**
 * Loads the signed-in user's profile row. `@/db` is imported dynamically so its
 * `DATABASE_URL` requirement stays out of the build-time module graph. Any
 * failure degrades to `null` (the page falls back to the session fields).
 */
export async function getUserProfile(
  userId: string,
): Promise<UserProfile | null> {
  if (!userId) return null;

  try {
    const { db } = await import("@/db");
    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      email: row.email,
      image: row.image,
      role: row.role,
      createdAt: row.createdAt.toISOString(),
    };
  } catch (error) {
    console.error("[user] getUserProfile failed:", (error as Error).message);
    return null;
  }
}
