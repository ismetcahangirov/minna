import { NextResponse } from "next/server";

import { auth } from "@/auth";

// Route segments that require an authenticated user. Extend this list as
// login-only areas are built (profile — EPIC-09, favorites — EPIC-08, …).
const PROTECTED_PREFIXES = ["/profile", "/favorites"];

// Admin panel (EPIC-12) — requires the `admin` role, not just a session.
const ADMIN_PREFIX = "/admin";

function matches(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => matches(pathname, prefix));
}

// Next.js 16 renamed the `middleware` convention to `proxy` (Node.js runtime by
// default). Wrapping the handler in Auth.js `auth()` decodes the session JWT
// and exposes it as `req.auth`, with no DB round-trip on normal requests.
export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Admin routes are the first layer of RBAC (ADMIN-01): signed-out users go to
  // login, signed-in non-admins are bounced home. The server layout and every
  // admin action re-check the role, so this is an optimisation, not the only
  // gate.
  if (matches(pathname, ADMIN_PREFIX)) {
    if (!req.auth) {
      const loginUrl = new URL("/login", req.nextUrl.origin);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (req.auth.user?.role !== "admin") {
      return NextResponse.redirect(new URL("/", req.nextUrl.origin));
    }
    return NextResponse.next();
  }

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
  matcher: ["/profile/:path*", "/favorites/:path*", "/admin/:path*"],
};
