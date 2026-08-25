"use server";

import { sql } from "drizzle-orm";
import { redirect } from "next/navigation";

import { discussionThreads } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import {
  isDiscussionScope,
  type DiscussionScope,
} from "@/lib/discussions/types";
import {
  consumeRateLimit,
  TEXT_LIMITS,
  validateMemberText,
} from "@/lib/moderation";

/**
 * Why a community write was refused. Stable codes, not messages — the client
 * owns the localized copy (EN/TR/RU), matching the profile and admin forms.
 *
 * `titleProfanity` / `bodyProfanity` are what the members actually see when the
 * language filter (COMM-05) stops a post, so the two fields are reported
 * separately and the offending text is handed back for editing rather than
 * silently dropped.
 */
export type CommunityError =
  | "unauthorized"
  | "invalidTarget"
  | "titleEmpty"
  | "titleTooShort"
  | "titleTooLong"
  | "titleProfanity"
  | "bodyEmpty"
  | "bodyTooShort"
  | "bodyTooLong"
  | "bodyProfanity"
  | "locked"
  | "rateLimited"
  | "failed";

export interface ThreadFormState {
  status: "idle" | "error";
  error?: CommunityError;
}

export interface PostFormState {
  status: "idle" | "success" | "error";
  error?: CommunityError;
}

/** Maps a text rejection onto the field-qualified code the form renders. */
function fieldError(
  field: "title" | "body",
  rejection: "empty" | "tooShort" | "tooLong" | "profanity",
): CommunityError {
  const suffix =
    rejection === "empty"
      ? "Empty"
      : rejection === "tooShort"
        ? "TooShort"
        : rejection === "tooLong"
          ? "TooLong"
          : "Profanity";
  return `${field}${suffix}` as CommunityError;
}

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function positiveInt(formData: FormData, key: string): number | null {
  const raw = text(formData, key);
  if (!/^\d+$/.test(raw)) return null;
  const value = Number.parseInt(raw, 10);
  return value > 0 ? value : null;
}

/** Reads the rows out of a raw driver result, whichever shape it arrives in. */
function firstRow(result: unknown): Record<string, unknown> | undefined {
  if (Array.isArray(result)) return result[0] as Record<string, unknown>;
  const rows = (result as { rows?: unknown[] })?.rows;
  return Array.isArray(rows) ? (rows[0] as Record<string, unknown>) : undefined;
}

/**
 * Opens a discussion about an anime, one of its seasons, or a single episode
 * (COMM-01).
 *
 * The anime's title and art are copied onto the thread row, so the community
 * listing renders without a catalog call for every entry. Title and body both
 * pass the profanity gate before anything is written — refused text never
 * reaches the database — and the member's write rate is checked in Redis, not
 * with a counting query.
 *
 * Shaped for `useActionState`; redirects to the new thread on success.
 */
export async function createThread(
  _prevState: ThreadFormState,
  formData: FormData,
): Promise<ThreadFormState> {
  const user = await getCurrentUser();
  if (!user?.id) return { status: "error", error: "unauthorized" };

  const rawScope = text(formData, "scope");
  const scope: DiscussionScope = isDiscussionScope(rawScope)
    ? rawScope
    : "anime";
  const animeId = text(formData, "animeId");
  const animeTitle = text(formData, "animeTitle");
  if (!animeId || !animeTitle) {
    return { status: "error", error: "invalidTarget" };
  }

  const episodeNumber =
    scope === "episode" ? positiveInt(formData, "episodeNumber") : null;
  if (scope === "episode" && episodeNumber === null) {
    return { status: "error", error: "invalidTarget" };
  }

  const seasonId = scope === "season" ? text(formData, "seasonId") : "";
  const seasonLabel = scope === "season" ? text(formData, "seasonLabel") : "";
  if (scope === "season" && !seasonId) {
    return { status: "error", error: "invalidTarget" };
  }

  const title = validateMemberText(
    formData.get("title") as string,
    TEXT_LIMITS.threadTitle,
  );
  if (!title.ok)
    return { status: "error", error: fieldError("title", title.error) };

  const body = validateMemberText(
    formData.get("body") as string,
    TEXT_LIMITS.threadBody,
  );
  if (!body.ok)
    return { status: "error", error: fieldError("body", body.error) };

  if (!(await consumeRateLimit("thread", user.id))) {
    return { status: "error", error: "rateLimited" };
  }

  let threadId: string;
  try {
    const { db } = await import("@/db");
    const [created] = await db
      .insert(discussionThreads)
      .values({
        authorId: user.id,
        scope,
        animeId,
        animeTitle,
        animeImage: text(formData, "animeImage") || null,
        seasonId: seasonId || null,
        seasonLabel: seasonLabel || null,
        episodeNumber,
        title: title.value,
        body: body.value || null,
      })
      .returning({ id: discussionThreads.id });

    if (!created?.id) return { status: "error", error: "failed" };
    threadId = created.id;
  } catch (error) {
    console.error(
      "[discussions] createThread failed:",
      (error as Error).message,
    );
    return { status: "error", error: "failed" };
  }

  // Outside the try: `redirect` signals by throwing, and must not be caught.
  redirect(`/discussions/${threadId}`);
}

/**
 * Resolves the thread that holds an episode's reviews, opening it on the first
 * review (COMM-07).
 *
 * The site owns these threads (`auto`), so they have no author and no opening
 * post — the reviews themselves are the content. One statement both looks up
 * and creates, and the partial unique index on `(anime_id, episode_number)
 * WHERE auto` means two members reviewing at the same moment still end up in
 * one thread rather than two.
 */
async function resolveEpisodeThreadId(input: {
  animeId: string;
  animeTitle: string;
  animeImage: string | null;
  episodeNumber: number;
}): Promise<string | null> {
  const { db } = await import("@/db");
  const title = `${input.animeTitle} — Episode ${input.episodeNumber}`;

  const result = await db.execute(sql`
    WITH existing AS (
      SELECT id FROM discussion_threads
      WHERE anime_id = ${input.animeId}
        AND episode_number = ${input.episodeNumber}
        AND auto
      LIMIT 1
    ), created AS (
      INSERT INTO discussion_threads (
        scope, anime_id, anime_title, anime_image, episode_number, title, auto
      )
      SELECT 'episode'::discussion_scope, ${input.animeId}, ${input.animeTitle},
             ${input.animeImage}, ${input.episodeNumber}, ${title}, true
      WHERE NOT EXISTS (SELECT 1 FROM existing)
      ON CONFLICT (anime_id, episode_number) WHERE auto DO NOTHING
      RETURNING id
    )
    SELECT COALESCE(
      (SELECT id FROM created),
      (SELECT id FROM existing)
    ) AS id
  `);

  const id = firstRow(result)?.id;
  if (typeof id === "string") return id;

  // Lost the race and the conflicting insert did nothing: read the winner.
  const { getEpisodeThread } = await import("@/lib/discussions/queries");
  const thread = await getEpisodeThread(input.animeId, input.episodeNumber);
  return thread?.id ?? null;
}

/**
 * Writes a reply into a thread, or a review under an episode (COMM-02/COMM-07).
 *
 * Both are the same row: an episode review is a post in that episode's thread,
 * so one profanity gate, one throttle and one moderation path cover the whole
 * site. The insert and the thread's `reply_count` / `last_post_at` bump run as
 * a single statement, which also enforces the lock — a locked thread simply
 * matches nothing and no row is written.
 *
 * Shaped for `useActionState`; the form refreshes the route on success rather
 * than revalidating a path the action would have to be told about.
 */
export async function createPost(
  _prevState: PostFormState,
  formData: FormData,
): Promise<PostFormState> {
  const user = await getCurrentUser();
  if (!user?.id) return { status: "error", error: "unauthorized" };

  const body = validateMemberText(
    formData.get("body") as string,
    TEXT_LIMITS.post,
  );
  if (!body.ok)
    return { status: "error", error: fieldError("body", body.error) };

  if (!(await consumeRateLimit("post", user.id))) {
    return { status: "error", error: "rateLimited" };
  }

  try {
    let threadId = text(formData, "threadId");

    // No thread id: this is the first review under an episode, so open the
    // episode's own thread on the spot.
    if (!threadId) {
      const animeId = text(formData, "animeId");
      const animeTitle = text(formData, "animeTitle");
      const episodeNumber = positiveInt(formData, "episodeNumber");
      if (!animeId || !animeTitle || episodeNumber === null) {
        return { status: "error", error: "invalidTarget" };
      }

      const resolved = await resolveEpisodeThreadId({
        animeId,
        animeTitle,
        animeImage: text(formData, "animeImage") || null,
        episodeNumber,
      });
      if (!resolved) return { status: "error", error: "failed" };
      threadId = resolved;
    }

    const { db } = await import("@/db");
    const result = await db.execute(sql`
      WITH target AS (
        SELECT id FROM discussion_threads
        WHERE id = ${threadId} AND NOT locked
      ), created AS (
        INSERT INTO discussion_posts (thread_id, author_id, body)
        SELECT id, ${user.id}, ${body.value} FROM target
        RETURNING id
      ), bumped AS (
        UPDATE discussion_threads
        SET reply_count = reply_count + 1, last_post_at = now()
        WHERE id IN (SELECT id FROM target)
        RETURNING id
      )
      SELECT (SELECT id FROM created) AS post_id
    `);

    const postId = firstRow(result)?.post_id;
    if (typeof postId !== "string") return { status: "error", error: "locked" };

    return { status: "success" };
  } catch (error) {
    console.error("[discussions] createPost failed:", (error as Error).message);
    return { status: "error", error: "failed" };
  }
}
