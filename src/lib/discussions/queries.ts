import "server-only";

import { and, asc, desc, eq, sql } from "drizzle-orm";

import { discussionPosts, discussionThreads, users } from "@/db/schema";
import type { PagedResult } from "@/lib/browse/types";
import {
  POSTS_PAGE_SIZE,
  THREADS_PAGE_SIZE,
  type DiscussionAuthor,
  type DiscussionPostItem,
  type DiscussionScope,
  type ThreadDetail,
  type ThreadSummary,
} from "@/lib/discussions/types";

/** Guards the query against absurd deep-link pages. */
const MAX_PAGE = 200;

function safePage(page: number | undefined): number {
  if (!Number.isFinite(page) || (page as number) < 1) return 1;
  return Math.min(Math.floor(page as number), MAX_PAGE);
}

type AuthorColumns = {
  authorId: string | null;
  authorName: string | null;
  authorImage: string | null;
  authorHandle: string | null;
};

function toAuthor(row: AuthorColumns): DiscussionAuthor | null {
  if (!row.authorId || !row.authorName) return null;
  return {
    id: row.authorId,
    name: row.authorName,
    image: row.authorImage,
    handle: row.authorHandle,
  };
}

const THREAD_COLUMNS = {
  id: discussionThreads.id,
  scope: discussionThreads.scope,
  animeId: discussionThreads.animeId,
  animeTitle: discussionThreads.animeTitle,
  animeImage: discussionThreads.animeImage,
  seasonId: discussionThreads.seasonId,
  seasonLabel: discussionThreads.seasonLabel,
  episodeNumber: discussionThreads.episodeNumber,
  title: discussionThreads.title,
  replyCount: discussionThreads.replyCount,
  locked: discussionThreads.locked,
  auto: discussionThreads.auto,
  lastPostAt: discussionThreads.lastPostAt,
  createdAt: discussionThreads.createdAt,
  authorId: users.id,
  authorName: users.name,
  authorImage: users.image,
  authorHandle: users.handle,
} as const;

type ThreadRow = {
  id: string;
  scope: DiscussionScope;
  animeId: string;
  animeTitle: string;
  animeImage: string | null;
  seasonId: string | null;
  seasonLabel: string | null;
  episodeNumber: number | null;
  title: string;
  replyCount: number;
  locked: boolean;
  auto: boolean;
  lastPostAt: Date;
  createdAt: Date;
} & AuthorColumns;

function toSummary(row: ThreadRow): ThreadSummary {
  return {
    id: row.id,
    scope: row.scope,
    animeId: row.animeId,
    animeTitle: row.animeTitle,
    animeImage: row.animeImage,
    seasonId: row.seasonId,
    seasonLabel: row.seasonLabel,
    episodeNumber: row.episodeNumber,
    title: row.title,
    replyCount: row.replyCount,
    locked: row.locked,
    auto: row.auto,
    author: toAuthor(row),
    lastPostAt: row.lastPostAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * One page of the community listing (COMM-03), most recently active first, and
 * optionally narrowed to a single anime.
 *
 * Reads `THREADS_PAGE_SIZE + 1` rows so `hasNextPage` is known without a count
 * query, and the ordering is served straight off the `last_post_at` index — no
 * aggregate over `discussion_posts` is ever run, because every thread carries
 * its own reply counter. The author join is a primary-key lookup and the anime
 * title/art come off the thread row itself, so a full page of results costs one
 * query and no catalog call.
 */
export async function listThreads(
  options: { page?: number; animeId?: string | null } = {},
): Promise<PagedResult<ThreadSummary>> {
  const current = safePage(options.page);
  const animeId = options.animeId?.trim();

  try {
    const { db } = await import("@/db");
    const rows = await db
      .select(THREAD_COLUMNS)
      .from(discussionThreads)
      .leftJoin(users, eq(users.id, discussionThreads.authorId))
      .where(animeId ? eq(discussionThreads.animeId, animeId) : undefined)
      .orderBy(desc(discussionThreads.lastPostAt))
      .limit(THREADS_PAGE_SIZE + 1)
      .offset((current - 1) * THREADS_PAGE_SIZE);

    return {
      items: rows.slice(0, THREADS_PAGE_SIZE).map(toSummary),
      page: current,
      hasNextPage: rows.length > THREADS_PAGE_SIZE,
    };
  } catch (error) {
    console.error(
      "[discussions] listThreads failed:",
      (error as Error).message,
    );
    return { items: [], page: current, hasNextPage: false };
  }
}

/** One thread with its opening post (COMM-04), or null when it is gone. */
export async function getThread(id: string): Promise<ThreadDetail | null> {
  if (!id) return null;

  try {
    const { db } = await import("@/db");
    const rows = await db
      .select({ ...THREAD_COLUMNS, body: discussionThreads.body })
      .from(discussionThreads)
      .leftJoin(users, eq(users.id, discussionThreads.authorId))
      .where(eq(discussionThreads.id, id))
      .limit(1);

    const row = rows[0];
    return row ? { ...toSummary(row), body: row.body } : null;
  } catch (error) {
    console.error("[discussions] getThread failed:", (error as Error).message);
    return null;
  }
}

/**
 * The thread holding an episode's reviews (COMM-07), or null before anyone has
 * written one. Resolved through the partial unique index on
 * `(anime_id, episode_number) WHERE auto`, so the watch page's lookup is a
 * single index probe.
 */
export async function getEpisodeThread(
  animeId: string,
  episodeNumber: number,
): Promise<ThreadDetail | null> {
  if (!animeId || !Number.isFinite(episodeNumber)) return null;

  try {
    const { db } = await import("@/db");
    const rows = await db
      .select({ ...THREAD_COLUMNS, body: discussionThreads.body })
      .from(discussionThreads)
      .leftJoin(users, eq(users.id, discussionThreads.authorId))
      .where(
        and(
          eq(discussionThreads.animeId, animeId),
          eq(discussionThreads.episodeNumber, Math.floor(episodeNumber)),
          eq(discussionThreads.auto, true),
        ),
      )
      .limit(1);

    const row = rows[0];
    return row ? { ...toSummary(row), body: row.body } : null;
  } catch (error) {
    console.error(
      "[discussions] getEpisodeThread failed:",
      (error as Error).message,
    );
    return null;
  }
}

/**
 * One page of a thread's replies (COMM-04), oldest first — the order a
 * conversation is read in. Served by the `(thread_id, created_at)` index, with
 * the same "one extra row" trick instead of a count query.
 */
export async function listThreadPosts(
  threadId: string,
  page: number = 1,
  pageSize: number = POSTS_PAGE_SIZE,
): Promise<PagedResult<DiscussionPostItem>> {
  const current = safePage(page);
  const size = Math.min(Math.max(1, Math.floor(pageSize)), POSTS_PAGE_SIZE);
  if (!threadId) return { items: [], page: current, hasNextPage: false };

  try {
    const { db } = await import("@/db");
    const rows = await db
      .select({
        id: discussionPosts.id,
        body: discussionPosts.body,
        createdAt: discussionPosts.createdAt,
        authorId: users.id,
        authorName: users.name,
        authorImage: users.image,
        authorHandle: users.handle,
      })
      .from(discussionPosts)
      .leftJoin(users, eq(users.id, discussionPosts.authorId))
      .where(eq(discussionPosts.threadId, threadId))
      .orderBy(asc(discussionPosts.createdAt))
      .limit(size + 1)
      .offset((current - 1) * size);

    return {
      items: rows.slice(0, size).map((row) => ({
        id: row.id,
        body: row.body,
        author: toAuthor(row),
        createdAt: row.createdAt.toISOString(),
      })),
      page: current,
      hasNextPage: rows.length > size,
    };
  } catch (error) {
    console.error(
      "[discussions] listThreadPosts failed:",
      (error as Error).message,
    );
    return { items: [], page: current, hasNextPage: false };
  }
}

/**
 * How many threads a member has started and how many replies they have written
 * — the two community numbers on a public profile. Both are indexed lookups on
 * the author column.
 */
export async function getMemberDiscussionStats(
  userId: string,
): Promise<{ threads: number; posts: number }> {
  if (!userId) return { threads: 0, posts: 0 };

  try {
    const { db } = await import("@/db");
    const [threads, posts] = await Promise.all([
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(discussionThreads)
        .where(eq(discussionThreads.authorId, userId)),
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(discussionPosts)
        .where(eq(discussionPosts.authorId, userId)),
    ]);

    return {
      threads: Number(threads[0]?.total ?? 0),
      posts: Number(posts[0]?.total ?? 0),
    };
  } catch (error) {
    console.error(
      "[discussions] getMemberDiscussionStats failed:",
      (error as Error).message,
    );
    return { threads: 0, posts: 0 };
  }
}
