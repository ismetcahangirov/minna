import "server-only";

import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";

import { users } from "@/db/schema";
import type { PagedResult } from "@/lib/browse/types";
import {
  MEMBERS_PAGE_SIZE,
  type MemberProfile,
  type MemberSummary,
} from "@/lib/members/types";

/** Guards the query against absurd deep-link pages. */
const MAX_PAGE = 100;

function safePage(page: number | undefined): number {
  if (!Number.isFinite(page) || (page as number) < 1) return 1;
  return Math.min(Math.floor(page as number), MAX_PAGE);
}

/** Escapes the LIKE wildcards so a search for "50%" matches literally. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/** Anything a public listing may read. The email is deliberately absent. */
const PUBLIC_COLUMNS = {
  id: users.id,
  handle: users.handle,
  name: users.name,
  image: users.image,
  createdAt: users.createdAt,
} as const;

function toSummary(row: {
  id: string;
  handle: string | null;
  name: string;
  image: string | null;
  createdAt: Date;
}): MemberSummary {
  return {
    id: row.id,
    handle: row.handle,
    name: row.name,
    image: row.image,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * One page of the member directory (MEM-02), optionally filtered by name or
 * handle.
 *
 * Blocked accounts are excluded, and no per-member statistics are gathered
 * here: a directory page costs exactly one query, and the counts a visitor
 * cares about are read once, on the profile they actually open. Browsing shows
 * the newest members first; searching orders by name, which is what a reader
 * scanning results expects.
 */
export async function listMembers(
  options: { query?: string | null; page?: number } = {},
): Promise<PagedResult<MemberSummary>> {
  const current = safePage(options.page);
  const query = options.query?.trim();

  try {
    const { db } = await import("@/db");
    const pattern = query ? `%${escapeLike(query)}%` : null;
    const where = pattern
      ? and(
          eq(users.blocked, false),
          or(ilike(users.name, pattern), ilike(users.handle, pattern)),
        )
      : eq(users.blocked, false);

    const rows = await db
      .select(PUBLIC_COLUMNS)
      .from(users)
      .where(where)
      .orderBy(pattern ? asc(users.name) : desc(users.createdAt))
      .limit(MEMBERS_PAGE_SIZE + 1)
      .offset((current - 1) * MEMBERS_PAGE_SIZE);

    return {
      items: rows.slice(0, MEMBERS_PAGE_SIZE).map(toSummary),
      page: current,
      hasNextPage: rows.length > MEMBERS_PAGE_SIZE,
    };
  } catch (error) {
    console.error("[members] listMembers failed:", (error as Error).message);
    return { items: [], page: current, hasNextPage: false };
  }
}

/** Matches the id form so a handle-less account is still reachable by URL. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolves a public profile from the `/users/{handle}` segment (MEM-03).
 * Accepts the canonical handle and, for accounts that predate handles, their
 * id. Blocked accounts resolve to null, so a blocked member has no public page.
 */
export async function getMemberByHandle(
  param: string,
): Promise<MemberProfile | null> {
  const value = param?.trim();
  if (!value) return null;

  try {
    const { db } = await import("@/db");
    const rows = await db
      .select({ ...PUBLIC_COLUMNS, libraryPublic: users.libraryPublic })
      .from(users)
      .where(
        and(
          eq(users.blocked, false),
          UUID.test(value) ? eq(users.id, value) : eq(users.handle, value),
        ),
      )
      .limit(1);

    const row = rows[0];
    return row ? { ...toSummary(row), libraryPublic: row.libraryPublic } : null;
  } catch (error) {
    console.error(
      "[members] getMemberByHandle failed:",
      (error as Error).message,
    );
    return null;
  }
}

/** How many members the directory holds, for the page's subtitle. */
export async function countMembers(): Promise<number> {
  try {
    const { db } = await import("@/db");
    const rows = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.blocked, false));
    return Number(rows[0]?.total ?? 0);
  } catch (error) {
    console.error("[members] countMembers failed:", (error as Error).message);
    return 0;
  }
}

/**
 * Whether the member currently lets others read their library (MEM-04). Reads
 * the account row rather than the session, so a change is reflected at once
 * instead of waiting for the JWT to refresh. Defaults to visible on failure,
 * matching the column default.
 */
export async function getUserVisibility(userId: string): Promise<boolean> {
  if (!userId) return false;

  try {
    const { db } = await import("@/db");
    const rows = await db
      .select({ libraryPublic: users.libraryPublic })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return rows[0]?.libraryPublic ?? true;
  } catch (error) {
    console.error(
      "[members] getUserVisibility failed:",
      (error as Error).message,
    );
    return true;
  }
}
