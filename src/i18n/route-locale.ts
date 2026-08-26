import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getLocale, setRequestLocale } from "next-intl/server";

import type { Locale } from "@/i18n/config";
import { routing } from "@/i18n/routing";

/** The `[locale]` segment as Next hands it over: an unvalidated string. */
export interface LocaleParams {
  locale: string;
}

/** Props shared by every page and layout under the `[locale]` segment. */
export interface LocaleRouteProps {
  params: Promise<LocaleParams>;
}

/**
 * Validates the `[locale]` route segment and hands back a typed locale.
 *
 * Two things have to happen at the top of every page under the segment, and
 * forgetting either is silent, so they live together here:
 *
 * 1. **Reject an unknown segment.** `[locale]` is effectively a catch-all —
 *    `/unknown.txt` reaches it as `locale: "unknown.txt"` — so without this a
 *    junk URL would render the English page and become indexable at an address
 *    that should have been a 404.
 * 2. **Register the locale for static rendering.** `setRequestLocale` is what
 *    lets a page read translations without opting the whole route into dynamic
 *    rendering.
 *
 * Safe to call from both `generateMetadata` and the page body.
 */
export async function resolveLocale(
  params: Promise<LocaleParams>,
): Promise<Locale> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);
  return locale;
}

/**
 * The active locale outside a `[locale]` page — in a Server Action, where there
 * is no route segment to read.
 *
 * next-intl resolves it from the header the proxy set on the rewrite, so an
 * action invoked from `/tr/admin/blogs/new` reports `tr` and its redirect lands
 * back in Turkish. Narrowed to the app's own union, which `getLocale` cannot do
 * because it types the locale as a bare string.
 */
export async function getActiveLocale(): Promise<Locale> {
  const locale = await getLocale();
  return hasLocale(routing.locales, locale) ? locale : routing.defaultLocale;
}
