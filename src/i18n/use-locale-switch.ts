"use client";

import { usePathname } from "@/i18n/navigation";

/**
 * The current page, expressed so it can be rendered as a link in another
 * locale (I18N-04).
 *
 * `usePathname` here is the routing-aware one, so it returns the path *without*
 * the locale prefix — exactly what `<Link locale="tr">` wants, since it applies
 * the prefix itself. Feeding it a prefixed path would produce `/tr/tr/blogs`.
 *
 * Neither the query string nor the hash is baked into the href; `keepLocation`
 * appends the live ones at click time. That is not a detail of taste. This hook
 * is called from the language switcher, which lives in the header, which the
 * root layout renders on *every* route — and `useSearchParams` in a component
 * that is prerendered forces Next to bail out of the static render and hand the
 * whole subtree to the client. One hook call here therefore decided whether any
 * page in the app could be rendered once and cached, and the header would have
 * gone missing from the prerendered HTML that crawlers read. The hash was
 * already handled at click time for its own reasons; the query now travels the
 * same way.
 */
export function useCurrentRoute(): string {
  return usePathname();
}

/**
 * Carries the current query string and fragment across the locale switch.
 *
 * Assigning to an anchor's `search`/`hash` rewrites its `href` in place, and the
 * browser reads the href *after* the click handler returns — so the link still
 * works with JavaScript disabled, and gains the rest of the location when it is
 * enabled.
 *
 * The query matters because it is usually the page: `?q=naruto`, `?page=3`, a
 * filter. Dropping it would land the reader on a different page in the new
 * language rather than the same one.
 */
export function keepLocation(event: React.MouseEvent<HTMLAnchorElement>): void {
  const { search, hash } = window.location;
  if (search) event.currentTarget.search = search;
  if (hash) event.currentTarget.hash = hash;
}
