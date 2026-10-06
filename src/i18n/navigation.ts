import { createNavigation } from "next-intl/navigation";
import { type ComponentProps, createElement } from "react";

import { routing } from "@/i18n/routing";

/**
 * Locale-aware replacements for `next/link` and `next/navigation` (I18N-02).
 *
 * Every one of these takes an *unprefixed* path — `/blogs`, `/anime/21` — and
 * applies the active locale's prefix on the way out. Importing the plain
 * `next/link` anywhere in the app would silently drop the prefix and bounce a
 * Turkish reader back through the proxy into whatever their cookie says, so the
 * whole app imports from here instead.
 *
 * `getPathname` is the same computation without navigating: give it a href and
 * a locale and it returns that locale's path, which is how the `hreflang` sets
 * and the sitemap are built (I18N-03 / I18N-05).
 */
const navigation = createNavigation(routing);

export const { usePathname, useRouter, getPathname } = navigation;

/**
 * Viewport prefetch is off by default (PERF-06): a card grid otherwise fans one
 * page view out into dozens of metered requests and on-demand renders.
 */
export function Link({
  prefetch = false,
  ...props
}: ComponentProps<typeof navigation.Link>) {
  return createElement(navigation.Link, { prefetch, ...props });
}

/**
 * Re-exported with an explicit type rather than destructured with the rest.
 *
 * TypeScript only lets a `never`-returning call end a function's control flow
 * when the callee is a const with an *annotated* type; a destructured binding
 * does not qualify, even though the underlying signature says `never`. Without
 * these two lines every caller — each admin action, each canonical redirect —
 * fails with "function lacks ending return statement" and has to grow an
 * unreachable `return` to satisfy the compiler.
 */
export const redirect: typeof navigation.redirect = navigation.redirect;
export const permanentRedirect: typeof navigation.permanentRedirect =
  navigation.permanentRedirect;
