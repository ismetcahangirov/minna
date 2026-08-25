import "server-only";

import { eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { users, type User } from "@/db/schema";
import { baseHandle, suffixedHandle } from "@/lib/members/handle";

export interface GoogleProfile {
  /** Google's stable subject id (the OIDC `sub`). */
  googleId: string;
  email: string;
  name: string;
  image?: string | null;
}

/**
 * Picks a free public handle (MEM-01) for a member who does not have one yet:
 * their name if nobody has claimed it, otherwise the same stem with a short
 * random suffix. Handles are assigned at sign-in — a rare event — so the
 * directory and every public profile can resolve without ever writing on read.
 */
async function claimHandle(name: string, email: string): Promise<string> {
  const base = baseHandle(name, email);

  const taken = await db
    .select({ handle: users.handle })
    .from(users)
    .where(eq(users.handle, base))
    .limit(1);

  return taken.length === 0 ? base : suffixedHandle(base);
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
 *
 * A member who predates the directory gets their handle filled in here, on
 * their next sign-in; an existing handle is never rewritten, so a public
 * profile URL is stable once it has been handed out.
 */
export async function syncUser(profile: GoogleProfile): Promise<User> {
  const existing = await db
    .select({ handle: users.handle })
    .from(users)
    .where(eq(users.email, profile.email))
    .limit(1);

  const handle =
    existing[0]?.handle ?? (await claimHandle(profile.name, profile.email));

  const values = {
    googleId: profile.googleId,
    email: profile.email,
    name: profile.name,
    image: profile.image ?? null,
    handle,
  };

  const conflictUpdate = {
    target: users.email,
    set: {
      googleId: profile.googleId,
      name: profile.name,
      image: profile.image ?? null,
      // Never rewrite a handle that has already been handed out.
      handle: sql`COALESCE(${users.handle}, excluded.handle)`,
      updatedAt: new Date(),
    },
  };

  try {
    const [user] = await db
      .insert(users)
      .values(values)
      .onConflictDoUpdate(conflictUpdate)
      .returning();
    return user;
  } catch (error) {
    // Two members with the same name can claim one handle at the same instant.
    // The loser retries with a suffixed form rather than failing the sign-in.
    console.error("[auth] syncUser retrying:", (error as Error).message);
    const [user] = await db
      .insert(users)
      .values({ ...values, handle: suffixedHandle(handle) })
      .onConflictDoUpdate(conflictUpdate)
      .returning();
    return user;
  }
}
