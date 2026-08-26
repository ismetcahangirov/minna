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
import {
  canonicalRoutePath,
  matchAnimeRoute,
} from "@/lib/anime/canonical-path";
import { readCanonicalSlug } from "@/lib/anime/canonical-slug";

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
 * The canonical path for a slugged anime URL, or `null` when the request is
 * already canonical, is not one of those routes, or cannot be resolved.
 *
 * This has to happen here rather than in the page, which is where it used to
 * live and where it silently did nothing. `permanentRedirect` only produces a
 * 308 while the response has not started; `src/app/[locale]/loading.tsx` puts a
 * Suspense boundary above every page, so the shell is flushed long before
 * `getAnimeInfo` resolves and Next degrades the redirect to a `<meta refresh>`
 * inside a 200. A browser follows that and notices nothing — a crawler indexes
 * the 200 it was served, and `/anime/21-anything-at-all` becomes an indexable
 * duplicate of `/anime/21-one-piece`. Next's own guidance is explicit: "if
 * you'd like to redirect before the render process, use next.config.js or
 * Proxy".
 *
 * The cost is one Redis read on anime and watch URLs only — the registry is a
 * bare `{id}-{slug}` string, not the anime record — and a miss returns `null`,
 * which leaves the request behaving exactly as it did before.
 */
async function canonicalAnimePath(path: string): Promise<string | null> {
  const match = matchAnimeRoute(path);
  if (!match) return null;

  const slug = await readCanonicalSlug(match.id);
  if (!slug) return null;

  const canonical = canonicalRoutePath(match, slug);
  return canonical === path ? null : canonical;
}

/**
 * Emits the canonical redirect, folding it into whatever the locale layer
 * already decided so a visitor is never sent twice.
 *
 * A bare `/anime/21` from a Turkish reader is two moves at once: it has to gain
 * a `/tr` prefix *and* a slug. next-intl answers the first with a redirect of
 * its own, so rather than redirecting again on top of it, that response's
 * `Location` is rewritten in place — keeping its status and its `NEXT_LOCALE`
 * cookie. Everything else (an explicit `/tr/anime/21`, or `/anime/21` in
 * English) was going to be rewritten, not redirected, and gets a plain 308.
 */
function withCanonicalPath(
  request: NextRequest,
  response: Response,
  locale: Locale | null,
  canonical: string,
): Response {
  const location = response.headers.get("location");

  if (response.status >= 300 && response.status < 400 && location) {
    const target = new URL(location, request.nextUrl.origin);
    const { locale: targetLocale } = splitLocalePath(target.pathname);
    target.pathname = localePath(canonical, targetLocale ?? defaultLocale);

    response.headers.set("location", target.toString());
    return response;
  }

  const target = new URL(
    localePath(canonical, locale ?? defaultLocale),
    request.nextUrl.origin,
  );
  target.search = request.nextUrl.search;

  // 308 rather than 307: these URLs are consolidated permanently, and the
  // method preservation is what keeps a POST from silently becoming a GET.
  return NextResponse.redirect(target, 308);
}

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

export default async function proxy(
  request: NextRequest,
  event: unknown,
): Promise<Response> {
  const { locale, path } = splitLocalePath(request.nextUrl.pathname);

  if (needsSession(path)) {
    // `auth()` types its handler as optionally returning nothing, meaning "let
    // the request through" — which is what `next()` is.
    const gated = await (guarded as GuardedHandler)(request, event);
    return gated ?? NextResponse.next();
  }

  // Resolved before the locale layer runs so the two answers can be merged into
  // a single hop; `null` for every path that is not a slugged anime URL, which
  // costs one string match.
  const canonical = await canonicalAnimePath(path);

  const response = await handleI18nRouting(request);
  if (!canonical) return response;

  return withCanonicalPath(request, response, locale, canonical);
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
