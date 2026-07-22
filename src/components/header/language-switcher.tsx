"use client";

import { Menu } from "@base-ui/react/menu";
import { Check, Globe } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";

import { setLocale } from "@/i18n/actions";
import { locales, localeNames, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

const itemClass =
  "text-muted-foreground data-highlighted:bg-muted data-highlighted:text-foreground flex cursor-pointer items-center justify-between gap-6 px-3 py-2 text-sm transition-colors outline-none select-none";

/**
 * Language switcher (HEADER-05). Writes the NEXT_LOCALE cookie via the
 * `setLocale` server action, then refreshes so server components re-render with
 * the new message catalog. Locale is cookie-based (no URL prefix) — see
 * `src/i18n/request.ts`.
 */
export function LanguageSwitcher() {
  const t = useTranslations("nav");
  const active = useLocale() as Locale;
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function selectLocale(locale: Locale) {
    if (locale === active) return;
    startTransition(async () => {
      await setLocale(locale);
      router.refresh();
    });
  }

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={t("language")}
        disabled={pending}
        className="text-muted-foreground hover:text-foreground data-popup-open:text-foreground focus-visible:text-foreground inline-flex size-9 items-center justify-center transition-colors outline-none disabled:opacity-50"
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
                onClick={() => selectLocale(locale)}
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
