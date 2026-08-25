import "server-only";

import { and, count, desc, eq } from "drizzle-orm";

import { userLibrary } from "@/db/schema";
import type { PagedResult } from "@/lib/browse/types";
import {
  EMPTY_LIBRARY_COUNTS,
  LIBRARY_PAGE_SIZE,
  libraryProgress,
  type LibraryCounts,
  type LibraryEntry,
  type LibraryStatus,
} from "@/lib/library/types";

/** Guards the query against absurd deep-link pages. */
const MAX_PAGE = 200;

function safePage(page: number | undefined): number {
  if (!Number.isFinite(page) || (page as number) < 1) return 1;
  return Math.min(Math.floor(page as number), MAX_PAGE);
}

type LibraryRow = {
  animeId: string;
  title: string;
  image: string | null;
  status: LibraryStatus;
  statusLocked: boolean;
  episodesWatched: number;
  totalEpisodes: number | null;
  lastEpisodeNumber: number | null;
  updatedAt: Date;
};

function toEntry(row: LibraryRow): LibraryEntry {
  return {
    animeId: row.animeId,
    title: row.title,
    image: row.image,
    status: row.status,
    statusLocked: row.statusLocked,
    episodesWatched: row.episodesWatched,
    totalEpisodes: row.totalEpisodes,
    lastEpisodeNumber: row.lastEpisodeNumber,
    progress: libraryProgress(row.episodesWatched, row.totalEpisodes),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const ENTRY_COLUMNS = {
  animeId: userLibrary.animeId,
  title: userLibrary.title,
  image: userLibrary.image,
  status: userLibrary.status,
  statusLocked: userLibrary.statusLocked,
  episodesWatched: userLibrary.episodesWatched,
  totalEpisodes: userLibrary.totalEpisodes,
  lastEpisodeNumber: userLibrary.lastEpisodeNumber,
  updatedAt: userLibrary.updatedAt,
} as const;

/**
 * One page of a member's library (LIB-03), most recently touched first,
 * optionally narrowed to a single shelf.
 *
 * Reads `LIBRARY_PAGE_SIZE + 1` rows so `hasNextPage` is known without a second
 * count query, and hits the `(user_id, status, updated_at desc)` index so no
 * sort step is needed. `@/db` is imported dynamically so its `DATABASE_URL`
 * requirement stays out of the build-time module graph; any failure degrades to
 * an empty page rather than breaking the render.
 */
export async function listLibrary(
  userId: string,
  options: { status?: LibraryStatus | null; page?: number } = {},
): Promise<PagedResult<LibraryEntry>> {
  const current = safePage(options.page);
  if (!userId) return { items: [], page: current, hasNextPage: false };

  const where = options.status
    ? and(
        eq(userLibrary.userId, userId),
        eq(userLibrary.status, options.status),
      )
    : eq(userLibrary.userId, userId);

  try {
    const { db } = await import("@/db");
    const rows = await db
      .select(ENTRY_COLUMNS)
      .from(userLibrary)
      .where(where)
      .orderBy(desc(userLibrary.updatedAt))
      .limit(LIBRARY_PAGE_SIZE + 1)
      .offset((current - 1) * LIBRARY_PAGE_SIZE);

    return {
      items: rows.slice(0, LIBRARY_PAGE_SIZE).map(toEntry),
      page: current,
      hasNextPage: rows.length > LIBRARY_PAGE_SIZE,
    };
  } catch (error) {
    console.error("[library] listLibrary failed:", (error as Error).message);
    return { items: [], page: current, hasNextPage: false };
  }
}

/**
 * The member's entry for one anime (LIB-04), seeding the detail page's progress
 * bar and status control. Returns null when the anime is not on any shelf.
 */
export async function getLibraryEntry(
  userId: string,
  animeId: string,
): Promise<LibraryEntry | null> {
  if (!userId || !animeId) return null;

  try {
    const { db } = await import("@/db");
    const rows = await db
      .select(ENTRY_COLUMNS)
      .from(userLibrary)
      .where(
        and(eq(userLibrary.userId, userId), eq(userLibrary.animeId, animeId)),
      )
      .limit(1);

    return rows[0] ? toEntry(rows[0]) : null;
  } catch (error) {
    console.error(
      "[library] getLibraryEntry failed:",
      (error as Error).message,
    );
    return null;
  }
}

/**
 * Entry counts per shelf, for the library tab bar and the public profile
 * summary. One grouped scan of the member's own rows over the same index the
 * listing uses — cheaper than five counting queries or a per-tab COUNT.
 */
export async function getLibraryCounts(userId: string): Promise<LibraryCounts> {
  if (!userId) return { ...EMPTY_LIBRARY_COUNTS };

  try {
    const { db } = await import("@/db");
    const rows = await db
      .select({ status: userLibrary.status, total: count() })
      .from(userLibrary)
      .where(eq(userLibrary.userId, userId))
      .groupBy(userLibrary.status);

    const counts: LibraryCounts = { ...EMPTY_LIBRARY_COUNTS };
    for (const row of rows) {
      counts[row.status] = Number(row.total);
      counts.total += Number(row.total);
    }
    return counts;
  } catch (error) {
    console.error(
      "[library] getLibraryCounts failed:",
      (error as Error).message,
    );
    return { ...EMPTY_LIBRARY_COUNTS };
  }
}
