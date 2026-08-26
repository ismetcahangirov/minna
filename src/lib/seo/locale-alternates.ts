import { locales, type Locale } from "@/i18n/config";
import { getPathname } from "@/i18n/navigation";
import { pickDefaultVersion } from "@/lib/seo/hreflang";

/**
 * The `hreflang` set for a page that exists in every locale (I18N-03).
 *
 * Site pages differ from blog posts: a blog article is written once in one
 * language and only exists in the languages someone translated it into, while
 * `/popular` is the same page in all three. So its language versions are the
 * same path under each locale's prefix, computed through the routing config
 * rather than string-concatenated — which is what keeps `as-needed` honest and
 * leaves English unprefixed instead of emitting a `/en/…` URL that would then
 * redirect.
 *
 * @param href The unprefixed path, e.g. `/popular` or `/anime/21-naruto`.
 */
export function localeVersions(href: string): Record<Locale, string> {
  return Object.fromEntries(
    locales.map((locale) => [locale, getPathname({ href, locale })]),
  ) as Record<Locale, string>;
}

/**
 * A page's `alternates` block: its own canonical plus the reciprocal
 * `hreflang` set and one agreed `x-default`.
 *
 * The canonical is always the current locale's own URL and never another
 * locale's — pointing the Turkish page at the English one would ask Google not
 * to index the Turkish page at all, which is the exact opposite of why the
 * locale went into the URL.
 *
 * `x-default` comes from {@link pickDefaultVersion} rather than being chosen
 * here, so the page, the blog and the sitemap cannot end up naming three
 * different defaults for one set — an inconsistency Google answers by dropping
 * the set entirely.
 *
 * Paths stay relative; Next resolves them against `metadataBase`.
 */
export function localeAlternates(
  href: string,
  locale: Locale,
): { canonical: string; languages: Record<string, string> } {
  const versions = localeVersions(href);

  return {
    canonical: versions[locale],
    languages: { ...versions, "x-default": pickDefaultVersion(versions) },
  };
}
