import "server-only";

import { db } from "@/db";
import { users, type User } from "@/db/schema";

export interface GoogleProfile {
  /** Google's stable subject id (the OIDC `sub`). */
  googleId: string;
  email: string;
  name: string;
  image?: string | null;
}

/**
 * Mirrors the Google user into Neon on every sign-in (AUTH-02): inserts the
 * row on first login and refreshes email/name/image on subsequent logins.
 * Keyed on `google_id` — the stable external identity — so the internal uuid
 * and role stay put across logins. Returns the row so the Auth.js `jwt`
 * callback can cache the internal id + role on the session token.
 */
export async function syncUser(profile: GoogleProfile): Promise<User> {
  const [user] = await db
    .insert(users)
    .values({
      googleId: profile.googleId,
      email: profile.email,
      name: profile.name,
      image: profile.image ?? null,
    })
    .onConflictDoUpdate({
      target: users.googleId,
      set: {
        email: profile.email,
        name: profile.name,
        image: profile.image ?? null,
        updatedAt: new Date(),
      },
    })
    .returning();

  return user;
}
