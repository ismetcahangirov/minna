import { NextResponse } from "next/server";

import { auth } from "@/auth";

// Route segments that require an authenticated user. Extend this list as
// login-only areas are built (profile — EPIC-09, favorites — EPIC-08, …).
const PROTECTED_PREFIXES = ["/profile", "/favorites"];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

// Next.js 16 renamed the `middleware` convention to `proxy` (Node.js runtime by
// default). Wrapping the handler in Auth.js `auth()` decodes the session JWT
// and exposes it as `req.auth`, with no DB round-trip on normal requests.
export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (isProtected(pathname) && !req.auth) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    // Let the login page (LOGIN-01) return the user where they came from.
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

// Only run the proxy on protected segments so it never adds latency to public
// pages or blocks static assets.
export const config = {
  matcher: ["/profile/:path*", "/favorites/:path*"],
};
