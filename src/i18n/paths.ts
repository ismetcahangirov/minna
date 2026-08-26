import { defaultLocale, isLocale, type Locale } from "@/i18n/config";

/**
 * String-level locale prefixing, for the two places that cannot use
 * `getPathname` from `@/i18n/navigation`: the proxy and the auth server
 * actions.
 *
 * Next's own guidance is that the proxy "should not attempt relying on shared
 * modules" from the render path — importing the navigation module there would
 * drag React and `next/link` into the edge bundle for the sake of one string
 * operation. These two functions are that operation, and they encode the same
 * `as-needed` rule the routing config declares: the default locale is the bare
 * path, every other locale is prefixed.
 *
 * @see src/i18n/routing.ts — the config these must stay in step with.
 */

/** `("/blogs", "tr")` → `"/tr/blogs"`; `("/blogs", "en")` → `"/blogs"`. */
export function localePath(path: string, locale: Locale): string {
  if (locale === defaultLocale) return path;
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}

/**
 * The inverse: splits a request pathname into its locale prefix (if any) and
 * the unprefixed path. `"/tr/blogs"` → `{locale: "tr", path: "/blogs"}`;
 * `"/blogs"` → `{locale: null, path: "/blogs"}`.
 *
 * The locale is `null` rather than the default when there is no prefix, because
 * the caller needs to tell "explicitly English" from "not yet decided" — a bare
 * URL still has to go through locale negotiation.
 */
export function splitLocalePath(pathname: string): {
  locale: Locale | null;
  path: string;
} {
  const [, first, ...rest] = pathname.split("/");
  if (!isLocale(first)) return { locale: null, path: pathname };

  const path = rest.length > 0 ? `/${rest.join("/")}` : "/";
  return { locale: first, path };
}
