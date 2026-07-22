import "server-only";

import { eq, or } from "drizzle-orm";

import { users } from "@/db/schema";

/**
 * Whether a Google identity maps to a blocked account (ADMIN-06). Checked in the
 * Auth.js `signIn` callback so a blocked user can never open a new session;
 * existing sessions expire naturally. Matched on the stable googleId first,
 * falling back to email. Fails open (returns `false`) on a DB error so an outage
 * never locks the whole platform out, matching the rest of the data layer.
 */
export async function isBlockedUser(identity: {
  googleId?: string | null;
  email?: string | null;
}): Promise<boolean> {
  const { googleId, email } = identity;
  if (!googleId && !email) return false;

  try {
    const { db } = await import("@/db");
    const conditions = [
      googleId ? eq(users.googleId, googleId) : undefined,
      email ? eq(users.email, email) : undefined,
    ].filter(Boolean) as ReturnType<typeof eq>[];

    const rows = await db
      .select({ blocked: users.blocked })
      .from(users)
      .where(conditions.length > 1 ? or(...conditions) : conditions[0])
      .limit(1);

    return rows[0]?.blocked ?? false;
  } catch (error) {
    console.error("[auth] isBlockedUser failed:", (error as Error).message);
    return false;
  }
}
