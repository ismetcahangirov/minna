import { createNavigation } from "next-intl/navigation";

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
export const {
  Link,
  redirect,
  permanentRedirect,
  usePathname,
  useRouter,
  getPathname,
} = createNavigation(routing);
