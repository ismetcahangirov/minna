"use server";

import { signIn, signOut } from "@/auth";
import { localePath } from "@/i18n/paths";
import { getActiveLocale } from "@/i18n/route-locale";

/**
 * Only same-origin, path-relative targets are allowed as a post-login
 * destination, so a crafted `?callbackUrl=` can't turn the login form into an
 * open redirect. Anything else (absolute URLs, protocol-relative `//host`,
 * backslash tricks) falls back to the home page.
 */
function safeRedirect(
  target: string | undefined | null,
  fallback: string,
): string {
  if (!target || !target.startsWith("/") || target.startsWith("//"))
    return fallback;
  // Backslashes are normalised to `/` by some browsers, so `/\evil.com` could
  // escape the origin — reject them outright.
  if (target.includes("\\")) return fallback;
  return target;
}

/**
 * Starts the Google OAuth flow. Invoked from a `<form action={...}>`; Auth.js
 * redirects the user to Google and, on success, back to the home page of the
 * locale they signed in from.
 */
export async function signInWithGoogle(): Promise<void> {
  await signIn("google", {
    redirectTo: localePath("/", await getActiveLocale()),
  });
}

/**
 * Google OAuth flow that returns the user to where they came from (LOGIN-01),
 * in the language they were browsing in. Used by the login page form: reads the
 * `callbackUrl` hidden field, validates it against open-redirect abuse, and
 * hands it to Auth.js as `redirectTo`.
 */
export async function signInWithGoogleTo(formData: FormData): Promise<void> {
  const callbackUrl = formData.get("callbackUrl");
  // `callbackUrl` is written by the proxy from the request path, so it already
  // carries the locale prefix and goes to Auth.js as-is. Only the fallback has
  // to be localized — landing an OAuth round-trip in the wrong language is
  // exactly the loss of context the locale prefix exists to prevent.
  const redirectTo = safeRedirect(
    typeof callbackUrl === "string" ? callbackUrl : null,
    localePath("/", await getActiveLocale()),
  );
  await signIn("google", { redirectTo });
}

/**
 * Ends the session (AUTH-04): clears the session cookie and redirects to the
 * home page of the locale the user was in.
 * A programmatic one-click alternative to Auth.js's default `/api/auth/signout`
 * confirmation page, for use from a `<form action={...}>`.
 */
export async function signOutUser(): Promise<void> {
  await signOut({ redirectTo: localePath("/", await getActiveLocale()) });
}
