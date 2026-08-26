"use client";

import { Menu } from "@base-ui/react/menu";
import { Check, Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { locales, localeNames, type Locale } from "@/i18n/config";
import { Link } from "@/i18n/navigation";
import { keepHash, useCurrentRoute } from "@/i18n/use-locale-switch";
import { cn } from "@/lib/utils";

const itemClass =
  "text-muted-foreground data-highlighted:bg-muted data-highlighted:text-foreground flex cursor-pointer items-center justify-between gap-6 px-3 py-2 text-sm transition-colors outline-none select-none";

/**
 * Language switcher (HEADER-05 / I18N-04).
 *
 * Each option is a real anchor to this same page in that language, carrying
 * `hrefLang` — so the choice is something a crawler can follow and a reader can
 * copy, and it still works with JavaScript disabled. It used to write the
 * NEXT_LOCALE cookie and call `router.refresh()`, which changed the language
 * without changing the URL: the result could not be linked to, shared or
 * indexed, and was the reason two thirds of the site was invisible to search.
 *
 * The cookie has not disappeared — the proxy still writes it as a
 * returning-visitor hint for bare URLs — but it no longer decides anything an
 * explicit URL has already settled.
 */
export function LanguageSwitcher() {
  const t = useTranslations("nav");
  const active = useLocale() as Locale;
  const href = useCurrentRoute();

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={t("language")}
        className="text-muted-foreground hover:text-foreground data-popup-open:text-foreground focus-visible:text-foreground inline-flex size-9 items-center justify-center transition-colors outline-none"
      >
        <Globe className="size-5" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner
          className="z-50 outline-none"
          sideOffset={8}
          align="end"
        >
          <Menu.Popup
            className={cn(
              "bg-popover text-popover-foreground border-border min-w-40 border p-1 shadow-lg outline-none",
              "origin-[var(--transform-origin)] transition-[transform,opacity] duration-150",
              "data-starting-style:scale-95 data-starting-style:opacity-0",
              "data-ending-style:scale-95 data-ending-style:opacity-0",
            )}
          >
            {locales.map((locale) => (
              <Menu.Item
                key={locale}
                className={itemClass}
                nativeButton={false}
                render={
                  <Link
                    href={href}
                    locale={locale}
                    hrefLang={locale}
                    lang={locale}
                    onClick={keepHash}
                  />
                }
              >
                {localeNames[locale]}
                {locale === active && <Check className="text-primary size-4" />}
              </Menu.Item>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
