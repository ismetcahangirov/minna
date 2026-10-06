import type { NextConfig } from "next";

import { defaultLocale, LOCALE_COOKIE, locales } from "./config";

type Redirects = Awaited<ReturnType<NonNullable<NextConfig["redirects"]>>>;
type Rewrites = Awaited<ReturnType<NonNullable<NextConfig["rewrites"]>>>;

/**
 * Locale routing as Vercel routing rules instead of a proxy run (PERF-06).
 *
 * The proxy used to see every page request — cache hits included, since it
 * runs in front of the CDN cache — so a page served from the edge still cost
 * a function invocation. These rules encode the same `as-needed` contract
 * (`src/i18n/routing.ts`) and are evaluated by the platform router for free.
 * The proxy now only runs for auth-gated sections and server actions.
 */
const prefixed = locales.filter((locale) => locale !== defaultLocale);

const reserved = [...locales, "api", "_next", "_vercel", "sitemaps"];

/** Any unprefixed page path: no locale prefix, no reserved root, no file extension. */
const BARE = `/:path((?!(?:${reserved.join("|")})(?:/|$))(?!.*\\.).+)`;

function negotiated(locale: string): Redirects {
  const byCookie = [
    { type: "cookie" as const, key: LOCALE_COOKIE, value: locale },
  ];
  const byHeader = [
    {
      type: "header" as const,
      key: "accept-language",
      value: `${locale}\\b.*`,
    },
  ];
  const noCookie = [{ type: "cookie" as const, key: LOCALE_COOKIE }];

  return [
    { source: "/", has: byCookie, destination: `/${locale}`, permanent: false },
    {
      source: BARE,
      has: byCookie,
      destination: `/${locale}/:path`,
      permanent: false,
    },
    {
      source: "/",
      has: byHeader,
      missing: noCookie,
      destination: `/${locale}`,
      permanent: false,
    },
    {
      source: BARE,
      has: byHeader,
      missing: noCookie,
      destination: `/${locale}/:path`,
      permanent: false,
    },
  ];
}

export function localeRedirects(): Redirects {
  return [
    { source: `/${defaultLocale}`, destination: "/", permanent: false },
    {
      source: `/${defaultLocale}/:path*`,
      destination: "/:path*",
      permanent: false,
    },
    ...prefixed.flatMap(negotiated),
  ];
}

export function localeRewrites(): Rewrites {
  return {
    beforeFiles: [
      { source: "/", destination: `/${defaultLocale}` },
      { source: BARE, destination: `/${defaultLocale}/:path` },
    ],
    afterFiles: [],
    fallback: [],
  };
}
