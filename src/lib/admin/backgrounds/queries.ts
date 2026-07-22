import "server-only";

import { backgroundVideos, type BackgroundVideo } from "@/db/schema";

/**
 * Every background override for the admin manager (ADMIN-04), across all pages
 * and variants. Defaults are not stored, so a page/variant absent from this list
 * is showing its built-in default. Degrades to an empty list on any DB failure.
 */
export async function listBackgroundOverrides(): Promise<BackgroundVideo[]> {
  try {
    const { db } = await import("@/db");
    return await db.select().from(backgroundVideos);
  } catch (error) {
    console.error(
      "[admin] listBackgroundOverrides failed:",
      (error as Error).message,
    );
    return [];
  }
}
