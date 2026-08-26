import { defaultLocale } from "@/i18n/config";

/**
 * The `x-default` target for one set of language versions.
 *
 * Every member of a set must name the *same* `x-default`, or Google treats the
 * set as inconsistent and falls back to ignoring it. Letting each page point at
 * itself would do exactly that, so the choice is made from the set rather than
 * from whichever page is rendering: the site's default locale when the article
 * has one, otherwise the alphabetically first tag — arbitrary, but identical
 * everywhere it is computed.
 *
 * @param versions URLs keyed by BCP-47 tag.
 */
export function pickDefaultVersion(versions: Record<string, string>): string {
  const fromDefaultLocale = versions[defaultLocale];
  if (fromDefaultLocale) return fromDefaultLocale;

  const [first] = Object.keys(versions).sort();
  return versions[first];
}
