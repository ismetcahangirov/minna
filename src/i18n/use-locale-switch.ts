"use client";

import { useSearchParams } from "next/navigation";

import { usePathname } from "@/i18n/navigation";

/** A query string reshaped for next-intl's `href` object. */
type Query = Record<string, string | string[]>;

/**
 * The current page, expressed so it can be rendered as a link in another
 * locale (I18N-04).
 *
 * `usePathname` here is the routing-aware one, so it returns the path *without*
 * the locale prefix — exactly what `<Link locale="tr">` wants, since it applies
 * the prefix itself. Feeding it a prefixed path would produce `/tr/tr/blogs`.
 *
 * The query survives the switch because it is usually the page: `?q=naruto`,
 * `?page=3`, a filter. Dropping it would land the reader on a different page in
 * the new language rather than the same one.
 *
 * The hash is deliberately *not* baked into the href — see the switcher, which
 * appends the live one at click time. It cannot be read during render without
 * an effect, and this codebase bans state writes from effects.
 */
export function useCurrentRoute(): { pathname: string; query: Query } {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const query: Query = {};
  for (const key of new Set(searchParams.keys())) {
    const values = searchParams.getAll(key);
    query[key] = values.length > 1 ? values : values[0];
  }

  return { pathname, query };
}

/**
 * Carries the current fragment across the locale switch.
 *
 * Assigning to an anchor's `hash` rewrites its `href` in place, and the browser
 * reads the href *after* the click handler returns — so the link still works
 * with JavaScript disabled, and gains the fragment when it is enabled.
 */
export function keepHash(event: React.MouseEvent<HTMLAnchorElement>): void {
  const { hash } = window.location;
  if (hash) event.currentTarget.hash = hash;
}
