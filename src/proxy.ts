import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";

import { auth } from "@/auth";
import {
  defaultLocale,
  isLocale,
  LOCALE_COOKIE,
  type Locale,
} from "@/i18n/config";
import { localePath, splitLocalePath } from "@/i18n/paths";
import { routing } from "@/i18n/routing";

// Route segments that require an authenticated user. Extend this list as
// login-only areas are built (profile — EPIC-09, favorites — EPIC-08, …).
const PROTECTED_PREFIXES = ["/profile", "/favorites", "/library"];

// Admin panel (EPIC-12) — requires the `admin` role, not just a session.
const ADMIN_PREFIX = "/admin";

/**
 * Locale routing (I18N-01). For a prefixed URL it rewrites `/tr/blogs` onto the
 * `[locale]` segment; for a bare URL it negotiates — cookie first, then
 * `Accept-Language` — and **redirects**, so one URL never renders two
 * languages. English is the exception by design: under `as-needed` the bare URL
 * *is* the English URL, so an English visitor is rewritten, never bounced.
 */
const handleI18nRouting = createMiddleware(routing);

function matches(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => matches(pathname, prefix));
}

function needsSession(pathname: string): boolean {
  return isProtected(pathname) || matches(pathname, ADMIN_PREFIX);
}

/**
 * The locale to send an unauthenticated visitor to.
 *
 * An explicit prefix wins; otherwise the cookie, which the i18n middleware
 * keeps in step with the last locale actually served. Guessing from
 * `Accept-Language` here would mean reimplementing next-intl's negotiation, and
 * getting a login redirect's language slightly wrong is not worth that — the
 * page they land on will negotiate properly anyway.
 */
function redirectLocale(request: NextRequest, prefix: Locale | null): Locale {
  if (prefix) return prefix;

  const cookie = request.cookies.get(LOCALE_COOKIE)?.value;
  return isLocale(cookie) ? cookie : defaultLocale;
}

/**
 * Sends the visitor to the login page in their own language, remembering where
 * they were headed. `callbackUrl` carries the *original* pathname, prefix and
 * all, so signing in returns them to the locale they started in rather than
 * dropping them into English (EPIC-18 acceptance criteria).
 */
function toLogin(request: NextRequest, locale: Locale): NextResponse {
  const url = new URL(localePath("/login", locale), request.nextUrl.origin);
  url.searchParams.set("callbackUrl", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

/**
 * Auth gating (AUTH-03 / ADMIN-01), wrapped in Auth.js `auth()` so the session
 * JWT is decoded and exposed as `req.auth` with no DB round-trip.
 *
 * Every check runs against the *unprefixed* path, so `/tr/admin` is gated
 * exactly like `/admin` — a locale prefix must never be a way around a guard.
 * When the check passes the request falls through to the i18n middleware, which
 * still has to rewrite it onto the `[locale]` segment.
 */
const guarded = auth((request) => {
  const { locale, path } = splitLocalePath(request.nextUrl.pathname);
  const target = redirectLocale(request, locale);

  if (matches(path, ADMIN_PREFIX)) {
    // Admin routes are the first layer of RBAC (ADMIN-01): signed-out users go
    // to login, signed-in non-admins are bounced home. The server layout and
    // every admin action re-check the role, so this is an optimisation, not the
    // only gate.
    if (!request.auth) return toLogin(request, target);
    if (request.auth.user?.role !== "admin") {
      return NextResponse.redirect(
        new URL(localePath("/", target), request.nextUrl.origin),
      );
    }
    return handleI18nRouting(request);
  }

  if (isProtected(path) && !request.auth) return toLogin(request, target);

  return handleI18nRouting(request);
});

/**
 * Next 16 renamed the `middleware` convention to `proxy`. One file gets to
 * handle a request, so the two concerns are composed rather than chained:
 * locale routing needs to see every public page, while the session decode is
 * expensive enough — and mutates `Set-Cookie` often enough to matter for a
 * cached public page — that it is worth confining to the routes that are
 * actually gated. Anything else goes straight to the i18n middleware.
 */
type GuardedHandler = (
  request: NextRequest,
  event: unknown,
) => ReturnType<typeof guarded>;

export default function proxy(
  request: NextRequest,
  event: unknown,
): ReturnType<typeof handleI18nRouting> | ReturnType<typeof guarded> {
  const { path } = splitLocalePath(request.nextUrl.pathname);

  if (needsSession(path)) return (guarded as GuardedHandler)(request, event);

  return handleI18nRouting(request);
}

export const config = {
  /*
   * Everything except API routes, Next's own assets, and any path with a file
   * extension — which covers `/sitemap.xml`, `/robots.txt`, `/icon.svg` and
   * `/manifest.webmanifest`. Those are locale-independent by definition: they
   * enumerate every locale rather than being served in one, so prefixing them
   * would produce three copies of the same file.
   *
   * The old matcher listed only the protected segments; locale routing has to
   * see every page, so the guard moved from the matcher into the handler.
   */
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
