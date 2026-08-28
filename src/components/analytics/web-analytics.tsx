"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

import { locales } from "@/i18n/config";

/**
 * Vercel Web Analytics: per-page views, referrers and countries for the public
 * pages — the traffic read the app has no store of its own for (nothing writes
 * a view counter). Mounted once in the locale layout, next to `WebVitals`, so
 * the client boundary stays confined to one tiny component.
 *
 * Collection is cookie-less and happens only on Vercel; locally and on any
 * other host the script is not served and the component is inert.
 */

// Locale-prefixed URLs mean the panel is reachable as both `/admin/...` and
// `/tr/admin/...`; strip a leading locale segment before matching.
const localePrefixes = new Set<string>(locales);

function isAdminPath(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0];
  return (first && localePrefixes.has(first) ? segments[1] : first) === "admin";
}

/**
 * Admin traffic is our own and would sit in the same report as the reader
 * traffic it is meant to measure, so those views are dropped before they are
 * sent rather than filtered out of every later reading.
 */
function beforeSend(event: BeforeSendEvent): BeforeSendEvent | null {
  return isAdminPath(new URL(event.url).pathname) ? null : event;
}

export function WebAnalytics() {
  return <Analytics beforeSend={beforeSend} />;
}
