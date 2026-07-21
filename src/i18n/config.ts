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

export function isLocale(value: string | undefined): value is Locale {
  return value !== undefined && locales.includes(value as Locale);
}
