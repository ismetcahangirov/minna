export const locales = ["en", "tr", "ru"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

/** Cookie the language switcher writes and the request config reads. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

export const localeNames: Record<Locale, string> = {
  en: "English",
  tr: "Türkçe",
  ru: "Русский",
};

/**
 * Open Graph wants `language_TERRITORY`, not the bare language tag the rest of
 * the app uses. Only `og:locale` and `og:locale:alternate` read these; every
 * other surface (`hreflang`, `lang`, `inLanguage`) takes the bare tag, which is
 * what a language-only audience targeting should send.
 */
export const openGraphLocales: Record<Locale, string> = {
  en: "en_US",
  tr: "tr_TR",
  ru: "ru_RU",
};

export function isLocale(value: string | undefined): value is Locale {
  return value !== undefined && locales.includes(value as Locale);
}
