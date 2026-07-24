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
 * row on first login and refreshes google_id/name/image on subsequent logins.
 *
 * Keyed on `email`, not `google_id`. Both columns are unique, and `email` is
 * the value that stays stable for a Google account across logins, so it is the
 * safe conflict target: matching an existing row updates it (and repairs its
 * `google_id`) instead of attempting an INSERT that the `email` unique
 * constraint would reject. `role` is intentionally left out of the update set
 * so an admin promotion survives every future login. Returns the row so the
 * Auth.js `jwt` callback can cache the internal id + role on the session token.
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
      target: users.email,
      set: {
        googleId: profile.googleId,
        name: profile.name,
        image: profile.image ?? null,
        updatedAt: new Date(),
      },
    })
    .returning();

  return user;
}
