import "server-only";

import { and, eq } from "drizzle-orm";

import { backgroundVideos } from "@/db/schema";
import {
  CACHE_TTL,
  cacheDelete,
  cacheGet,
  cacheKey,
  cacheSet,
} from "@/lib/cache";
import type {
  BackgroundPage,
  BackgroundSources,
} from "@/lib/backgrounds/config";

function key(page: BackgroundPage): string {
  return cacheKey("backgrounds", page);
}

/**
 * Active admin background overrides for a page (ADMIN-04), keyed by breakpoint
 * variant. An empty object means "no override" — the caller shows the built-in
 * default. Redis-cached on a medium TTL (admin edits invalidate it), and any
 * failure — including an unconfigured database — degrades to the default rather
 * than breaking the page.
 */
export async function getBackgroundSources(
  page: BackgroundPage,
): Promise<BackgroundSources> {
  const cached = await cacheGet<BackgroundSources>(key(page));
  if (cached) return cached;

  try {
    const { db } = await import("@/db");
    const rows = await db
      .select({
        variant: backgroundVideos.variant,
        videoUrl: backgroundVideos.videoUrl,
      })
      .from(backgroundVideos)
      .where(
        and(eq(backgroundVideos.page, page), eq(backgroundVideos.active, true)),
      );

    const sources: BackgroundSources = {};
    for (const row of rows) sources[row.variant] = row.videoUrl;

    await cacheSet(key(page), sources, CACHE_TTL.medium);
    return sources;
  } catch (error) {
    console.error("[backgrounds] load failed:", (error as Error).message);
    return {};
  }
}

/** Drops the cached override set for a page so an admin edit surfaces at once. */
export async function invalidateBackground(
  page: BackgroundPage,
): Promise<void> {
  await cacheDelete(key(page));
}
