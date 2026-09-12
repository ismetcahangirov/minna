/**
 * The authenticated user as the UI consumes it.
 *
 * Deliberately a standalone module rather than a field on the Auth.js session
 * type: the header reads the session in the *browser* now (see
 * `@/store/api/session-api`), so the shape has to be importable from a client
 * component. `@/lib/auth/session` cannot serve that purpose — it is
 * `server-only`, and importing it from a client island is a build error.
 *
 * Kept minimal on purpose. Only what the header renders belongs here; anything
 * richer would mean shipping more of the session to every visitor than the UI
 * has a use for.
 */
export interface SessionUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}
