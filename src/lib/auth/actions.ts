"use server";

import { signIn } from "@/auth";

/**
 * Starts the Google OAuth flow. Invoked from a `<form action={...}>` in a
 * client component; Auth.js redirects the user to Google and, on success,
 * back to `redirectTo`. Sign-out lives in AUTH-04.
 */
export async function signInWithGoogle(): Promise<void> {
  await signIn("google", { redirectTo: "/" });
}
