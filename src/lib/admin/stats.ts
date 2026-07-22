import "server-only";

import { count } from "drizzle-orm";

import { ads, blogs, users } from "@/db/schema";

/** Headline counts shown on the admin dashboard (ADMIN-01). */
export interface AdminOverview {
  users: number;
  blogs: number;
  ads: number;
}

/**
 * Aggregates the platform's headline counts for the admin dashboard. `@/db` is
 * imported dynamically so its `DATABASE_URL` requirement stays out of the
 * build-time module graph, and any failure — including an unconfigured
 * database — degrades to zeros rather than breaking the panel, matching the
 * rest of the data layer.
 */
export async function getAdminOverview(): Promise<AdminOverview> {
  try {
    const { db } = await import("@/db");
    const [userRows, blogRows, adRows] = await Promise.all([
      db.select({ value: count() }).from(users),
      db.select({ value: count() }).from(blogs),
      db.select({ value: count() }).from(ads),
    ]);

    return {
      users: userRows[0]?.value ?? 0,
      blogs: blogRows[0]?.value ?? 0,
      ads: adRows[0]?.value ?? 0,
    };
  } catch (error) {
    console.error("[admin] overview failed:", (error as Error).message);
    return { users: 0, blogs: 0, ads: 0 };
  }
}
