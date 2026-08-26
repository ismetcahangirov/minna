import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import { localePath } from "@/i18n/paths";

/**
 * Where a blog post lives, now that the locale is in the URL (I18N-07).
 *
 * A post and a page are different things. `/popular` is one page that exists in
 * three languages; an article is written once, in one language, and is only
 * available in another if someone translated it (#181). So a post gets exactly
 * one URL — its slug under the prefix of the language it is written in — and
 * requesting it under any other prefix redirects there.
 *
 * The alternative, serving the same article under all three prefixes, would
 * mint three near-identical URLs per post and put the page's `hreflang` in
 * direct conflict with the translation-group set, which is the arrangement
 * Google resolves by ignoring both.
 */

/** The language a post is written in, narrowed to a routing locale. */
export function postLocale(language: string): Locale {
  return isLocale(language) ? language : defaultLocale;
}

/**
 * A post's canonical path — the only URL it is reachable at.
 *
 * Built from {@link localePath} rather than the navigation helpers so it is
 * usable from a client card, a server page and the sitemap alike.
 */
export function blogPostHref(post: { slug: string; language: string }): string {
  return localePath(`/blogs/${post.slug}`, postLocale(post.language));
}
