/**
 * Public member shapes for the directory and public profiles (EPIC-17).
 *
 * Only what a member has chosen to make public appears here — never the Google
 * email, which stays on the account row and out of every public query.
 */

/** A member as listed in the directory. */
export interface MemberSummary {
  id: string;
  /** Null for accounts that predate handles; the UI falls back to the id. */
  handle: string | null;
  name: string;
  image: string | null;
  createdAt: string;
}

/** A member as read on their public profile. */
export interface MemberProfile extends MemberSummary {
  /** Whether this member lets others see their library. */
  libraryPublic: boolean;
}

/** How many members a directory page holds. */
export const MEMBERS_PAGE_SIZE = 24;

/** Longest accepted directory search term. */
export const MEMBER_QUERY_MAX_LENGTH = 40;

/**
 * The public profile path for a member. Handles are the canonical form; the id
 * stands in for accounts that predate them so no profile is unreachable.
 */
export function memberHref(member: {
  handle: string | null;
  id: string;
}): string {
  return `/users/${member.handle ?? member.id}`;
}

/**
 * Reads the `?q=` directory filter: whitespace collapsed and length-capped, or
 * null when nothing searchable remains — the same treatment the episode search
 * gives its query, so a junk param never gets its own URL.
 */
export function parseMemberQuery(
  raw: string | string[] | undefined,
): string | null {
  const query =
    typeof raw === "string"
      ? raw.replace(/\s+/g, " ").trim().slice(0, MEMBER_QUERY_MAX_LENGTH)
      : "";
  return query.length > 0 ? query : null;
}
