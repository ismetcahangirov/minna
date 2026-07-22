import "server-only";

import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/session";

/**
 * Admin role-based access control (ADMIN-01). The admin panel (EPIC-12) is
 * gated in three layers for defence in depth:
 *
 *  1. `src/proxy.ts` — a fast edge check on the session JWT that keeps
 *     non-admins from ever reaching an `/admin` route.
 *  2. `requireAdmin()` — the server layout (`app/admin/layout.tsx`) re-checks
 *     the decoded session so a stale/forged cookie can't render the shell.
 *  3. Every admin Server Action / route handler calls `requireAdmin()` itself
 *     — client-side protection is never sufficient (admin-panel skill).
 *
 * The role is carried on the session (populated from Neon in the Auth.js `jwt`
 * callback), so these helpers add no DB round-trip on a normal request.
 */

/**
 * The current user when they are a signed-in admin, otherwise `null`. Use this
 * for non-redirecting checks (e.g. conditionally showing an admin entry point).
 */
export async function getCurrentAdmin() {
  const user = await getCurrentUser();
  if (!user?.id || user.role !== "admin") return null;
  return user;
}

/**
 * Guards an admin-only server context: returns the admin user, or redirects —
 * to the login page when signed out, or to the home page when signed in without
 * the admin role (so a regular member never sees a dead end). Callers can treat
 * the return value as a guaranteed admin.
 */
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user?.id) redirect("/login?callbackUrl=/admin");
  if (user.role !== "admin") redirect("/");
  return user;
}
