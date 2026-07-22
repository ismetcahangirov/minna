import "server-only";

import { desc, eq } from "drizzle-orm";

import { ads, type Ad } from "@/db/schema";

/**
 * All ads for the admin table (ADMIN-02), newest first — including inactive
 * ones, which the public pool query hides. `@/db` is imported dynamically so its
 * `DATABASE_URL` requirement stays out of the build-time module graph; a failure
 * degrades to an empty list rather than breaking the panel.
 */
export async function listAdminAds(): Promise<Ad[]> {
  try {
    const { db } = await import("@/db");
    return await db.select().from(ads).orderBy(desc(ads.createdAt));
  } catch (error) {
    console.error("[admin] listAdminAds failed:", (error as Error).message);
    return [];
  }
}

/** A single ad by id for the edit form, or `null` when it does not exist. */
export async function getAdminAd(id: string): Promise<Ad | null> {
  const key = id?.trim();
  if (!key) return null;

  try {
    const { db } = await import("@/db");
    const rows = await db.select().from(ads).where(eq(ads.id, key)).limit(1);
    return rows[0] ?? null;
  } catch (error) {
    console.error("[admin] getAdminAd failed:", (error as Error).message);
    return null;
  }
}
