import "server-only";

/**
 * Public handles for the member directory (MEM-01).
 *
 * A handle is the only identifier a member is addressed by in public — the
 * directory lists it, `/users/{handle}` resolves it — so the email that Google
 * gives us never appears in a URL or a page.
 */

/** Longest base slug before the uniqueness suffix is appended. */
const BASE_MAX = 20;

/** Handles that would collide with a route segment or read as official. */
const RESERVED = new Set([
  "admin",
  "api",
  "me",
  "new",
  "search",
  "settings",
  "minna",
  "support",
  "staff",
  "moderator",
]);

/**
 * Turns a display name into a URL-safe base: lowercased, diacritics stripped,
 * every other run collapsed to a single dash. Returns "" when nothing usable
 * survives (a CJK-only name), so the caller can fall back.
 */
export function slugifyHandle(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, BASE_MAX)
    .replace(/-+$/g, "");
}

/** Four random base-36 characters, enough to separate same-named members. */
function suffix(): string {
  return Math.random().toString(36).slice(2, 6).padEnd(4, "0");
}

/**
 * Builds the base handle for a member: their display name, falling back to the
 * local part of their email, then to a generic stem. Reserved words and
 * anything too short are pushed through the suffixed form instead.
 */
export function baseHandle(name: string, email: string): string {
  const fromName = slugifyHandle(name);
  if (fromName.length >= 3 && !RESERVED.has(fromName)) return fromName;

  const fromEmail = slugifyHandle(email.split("@")[0] ?? "");
  if (fromEmail.length >= 3 && !RESERVED.has(fromEmail)) return fromEmail;

  return "member";
}

/** The fallback form, used when the plain handle is already taken. */
export function suffixedHandle(base: string): string {
  return `${base}-${suffix()}`;
}
