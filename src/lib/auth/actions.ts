"use server";

import { signIn, signOut } from "@/auth";

/**
 * Starts the Google OAuth flow. Invoked from a `<form action={...}>` in a
 * client component; Auth.js redirects the user to Google and, on success,
 * back to `redirectTo`.
 */
export async function signInWithGoogle(): Promise<void> {
  await signIn("google", { redirectTo: "/" });
}

/**
 * Ends the session (AUTH-04): clears the session cookie and redirects home.
 * A programmatic one-click alternative to Auth.js's default `/api/auth/signout`
 * confirmation page, for use from a `<form action={...}>`.
 */
export async function signOutUser(): Promise<void> {
  await signOut({ redirectTo: "/" });
}
