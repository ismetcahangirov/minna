import { defineRouting } from "next-intl/routing";

import { defaultLocale, locales, LOCALE_COOKIE } from "@/i18n/config";

/**
 * The single source of truth for locale routing (EPIC-18 / I18N-01).
 *
 * Both the proxy and `src/i18n/request.ts` read this object, so the locale can
 * never be resolved one way at the edge and another way while rendering.
 *
 * `as-needed` keeps English on the URLs that are already indexed — `/blogs`,
 * `/anime/21-…` — and prefixes only the other two languages (`/tr/blogs`,
 * `/ru/blogs`). The alternative, `always`, would have 301'd the entire indexed
 * English site in one move for no gain beyond uniformity.
 *
 * `localeDetection` lets the proxy negotiate a language for a *bare* visit —
 * the NEXT_LOCALE cookie first, then `Accept-Language`. It only ever decides
 * where an unprefixed URL sends the visitor; an explicit `/tr/…` URL always
 * renders Turkish no matter what the cookie holds, which is the whole point of
 * putting the locale in the path.
 *
 * `alternateLinks` is off because we emit `hreflang` from `generateMetadata`
 * instead (I18N-03). The proxy's `Link` header would build its own set from the
 * pathname alone and would therefore disagree with the blog, whose language
 * versions live under different slugs — and two disagreeing claims are worse
 * than one, since Google drops an inconsistent set entirely.
 */
export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "as-needed",
  localeDetection: true,
  alternateLinks: false,
  localeCookie: {
    name: LOCALE_COOKIE,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  },
});
