import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";

import { routing } from "@/i18n/routing";

/**
 * Per-request i18n configuration (I18N-01).
 *
 * The locale comes from the `[locale]` route segment the proxy matched — not
 * from a cookie any more. That is what lets one URL mean exactly one language:
 * a crawler with no cookie sees the same page a reader does, and a shared
 * `/tr/…` link opens in Turkish for everyone.
 *
 * `requestLocale` can still be `undefined` or junk, because `[locale]` also
 * catches paths that match no route at all (`/unknown.txt`), so it is validated
 * before being used to resolve a message catalogue.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
