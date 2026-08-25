/**
 * Community discussion shapes (EPIC-17). One thread model covers all three
 * scopes a conversation can hang off — a whole anime, one season, or a single
 * episode — so the community page and the per-episode review box read the same
 * rows through the same queries.
 *
 * Dates are ISO strings so a server-rendered page and any JSON endpoint share
 * one serializable shape.
 */

export const DISCUSSION_SCOPES = ["anime", "season", "episode"] as const;

export type DiscussionScope = (typeof DISCUSSION_SCOPES)[number];

export function isDiscussionScope(value: string): value is DiscussionScope {
  return (DISCUSSION_SCOPES as readonly string[]).includes(value);
}

/** Author as shown next to a thread or post; null once the account is gone. */
export interface DiscussionAuthor {
  id: string;
  name: string;
  image: string | null;
  /** Public directory handle; null for accounts created before it existed. */
  handle: string | null;
}

/** A thread as listed on the community page. */
export interface ThreadSummary {
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
  /** True for the thread the site opened by itself to hold episode reviews. */
  auto: boolean;
  author: DiscussionAuthor | null;
  lastPostAt: string;
  createdAt: string;
}

/** A thread as read on its own page — the summary plus its opening post. */
export interface ThreadDetail extends ThreadSummary {
  body: string | null;
}

/** One reply inside a thread, or one review under an episode. */
export interface DiscussionPostItem {
  id: string;
  body: string;
  author: DiscussionAuthor | null;
  createdAt: string;
}

/** How many threads a community page holds. */
export const THREADS_PAGE_SIZE = 20;

/** How many posts one page of a thread holds. */
export const POSTS_PAGE_SIZE = 20;

/** How many reviews the watch page shows under an episode before "see all". */
export const EPISODE_REVIEW_PREVIEW = 5;
