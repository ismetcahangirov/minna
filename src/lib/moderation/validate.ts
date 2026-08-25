import "server-only";

import { containsProfanity } from "@/lib/moderation/profanity";

/**
 * Why a member's text was refused. Stable codes, not messages — the client owns
 * the localized copy (EN/TR/RU), matching the profile/admin form actions.
 */
export type TextRejection = "empty" | "tooShort" | "tooLong" | "profanity";

export type TextCheck =
  { ok: true; value: string } | { ok: false; error: TextRejection };

/** Length bounds for every member-written field in the community features. */
export const TEXT_LIMITS = {
  threadTitle: { min: 4, max: 120 },
  threadBody: { min: 0, max: 4000 },
  post: { min: 2, max: 2000 },
} as const;

/**
 * Trims, collapses runaway blank lines, enforces the field's bounds and runs
 * the profanity gate (COMM-05) — the single check every community write goes
 * through, so nothing rejected is ever stored.
 *
 * The length cap is as much a database concern as an editorial one: it is what
 * keeps a free-tier row from growing without bound.
 */
export function validateMemberText(
  raw: string | null | undefined,
  bounds: { min: number; max: number },
): TextCheck {
  const value = String(raw ?? "")
    .replace(/\r\n/g, "\n")
    // At most one blank line between paragraphs.
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (value.length === 0) {
    return bounds.min === 0
      ? { ok: true, value }
      : { ok: false, error: "empty" };
  }
  if (value.length < bounds.min) return { ok: false, error: "tooShort" };
  if (value.length > bounds.max) return { ok: false, error: "tooLong" };
  if (containsProfanity(value)) return { ok: false, error: "profanity" };

  return { ok: true, value };
}
