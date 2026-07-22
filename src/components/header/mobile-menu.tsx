"use client";

import { Drawer } from "@base-ui/react/drawer";
import { Check, LogOut, Menu as MenuIcon, User, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";

import { NAV_ITEMS } from "@/components/header/nav-config";
import type { SessionUser } from "@/components/header/user-menu";
import { setLocale } from "@/i18n/actions";
import { locales, localeNames, type Locale } from "@/i18n/config";
import type { Category } from "@/lib/anime/genres";
import { cn } from "@/lib/utils";

interface MobileMenuProps {
  categories: Category[];
  user?: SessionUser | null;
  loginHref?: string;
  profileHref?: string;
  signOutHref?: string;
}

const sectionTitle =
  "text-muted-foreground px-1 pt-4 pb-2 text-xs font-semibold tracking-wide uppercase";

/**
 * Mobile / tablet navigation (HEADER-06). A burger button opens a panel that
 * slides in from the right (base-ui Drawer, right swipe-to-dismiss) holding the
 * full nav: primary links, categories, language switch and the auth actions.
 * Shown below `lg`, where the desktop nav is hidden.
 *
 * Navigating entries are wrapped in `Drawer.Close` so a tap both routes and
 * dismisses the panel — no route-watching effect needed.
 */
export function MobileMenu({
  categories,
  user,
  loginHref = "/login",
  profileHref = "/profile",
  signOutHref = "/api/auth/signout",
}: MobileMenuProps) {
  const tNav = useTranslations("nav");
  const tAuth = useTranslations("auth");
  const pathname = usePathname();
  const router = useRouter();
  const activeLocale = useLocale() as Locale;
  const [pending, startTransition] = useTransition();

  function selectLocale(locale: Locale) {
    if (locale === activeLocale) return;
    startTransition(async () => {
      await setLocale(locale);
      router.refresh();
    });
  }

  return (
    <Drawer.Root swipeDirection="right">
      <Drawer.Trigger
        aria-label={tNav("menu")}
        className="text-foreground hover:text-primary inline-flex size-9 items-center justify-center transition-colors outline-none lg:hidden"
      >
        <MenuIcon className="size-6" />
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Backdrop className="fixed inset-0 z-50 bg-black/70 transition-opacity duration-300 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Drawer.Viewport className="fixed inset-0 z-50 flex items-stretch justify-end">
          <Drawer.Popup
            className={cn(
              "bg-background border-border flex h-full w-[85vw] max-w-sm flex-col overflow-y-auto border-l p-6 outline-none",
              "transition-transform duration-300 ease-out",
              "data-ending-style:translate-x-full data-starting-style:translate-x-full",
            )}
          >
            <div className="flex items-center justify-between">
              <Drawer.Title className="text-primary text-xl font-extrabold tracking-tight uppercase">
                {tNav("menu")}
              </Drawer.Title>
              <Drawer.Close
                aria-label={tNav("close")}
                className="text-muted-foreground hover:text-foreground inline-flex size-9 items-center justify-center transition-colors outline-none"
              >
                <X className="size-5" />
              </Drawer.Close>
            </div>
            <Drawer.Description className="sr-only">
              {tNav("menu")}
            </Drawer.Description>

            {/* Auth */}
            <div className="mt-6">
              {user ? (
                <div className="border-border flex flex-col gap-1 border-b pb-4">
                  <Drawer.Close
                    nativeButton={false}
                    render={<Link href={profileHref} />}
                    className="text-foreground hover:bg-muted flex items-center gap-2 px-1 py-2 text-sm font-medium"
                  >
                    <User className="size-4" />
                    {user.name ?? user.email ?? tAuth("profile")}
                  </Drawer.Close>
                  <Drawer.Close
                    nativeButton={false}
                    render={<a href={signOutHref} />}
                    className="text-muted-foreground hover:text-foreground flex items-center gap-2 px-1 py-2 text-sm"
                  >
                    <LogOut className="size-4" />
                    {tAuth("logout")}
                  </Drawer.Close>
                </div>
              ) : (
                <Drawer.Close
                  nativeButton={false}
                  render={<Link href={loginHref} />}
                  className="bg-primary text-primary-foreground hover:bg-primary/80 flex h-10 items-center justify-center px-4 text-sm font-medium transition-colors"
                >
                  {tAuth("login")}
                </Drawer.Close>
              )}
            </div>

            {/* Primary links */}
            <p className={sectionTitle}>{tNav("menu")}</p>
            <nav className="flex flex-col">
              {NAV_ITEMS.map(({ href, labelKey, icon: Icon }) => {
                const active =
                  pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <Drawer.Close
                    key={href}
                    nativeButton={false}
                    render={<Link href={href} />}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 px-1 py-3 text-base font-medium transition-colors",
                      active
                        ? "text-primary"
                        : "text-foreground hover:text-primary",
                    )}
                  >
                    <Icon className="size-5" />
                    {tNav(labelKey)}
                  </Drawer.Close>
                );
              })}
            </nav>

            {/* Categories */}
            {categories.length > 0 && (
              <>
                <p className={sectionTitle}>{tNav("categories")}</p>
                <div className="grid grid-cols-2 gap-x-2">
                  {categories.map((category) => (
                    <Drawer.Close
                      key={category.slug}
                      nativeButton={false}
                      render={<Link href={`/genre/${category.slug}`} />}
                      className="text-muted-foreground hover:text-foreground px-1 py-2 text-sm transition-colors"
                    >
                      {category.name}
                    </Drawer.Close>
                  ))}
                </div>
              </>
            )}

            {/* Language */}
            <p className={sectionTitle}>{tNav("language")}</p>
            <div className="flex flex-col">
              {locales.map((locale) => (
                <button
                  key={locale}
                  type="button"
                  disabled={pending}
                  onClick={() => selectLocale(locale)}
                  className={cn(
                    "flex items-center justify-between px-1 py-2 text-sm transition-colors disabled:opacity-50",
                    locale === activeLocale
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {localeNames[locale]}
                  {locale === activeLocale && (
                    <Check className="text-primary size-4" />
                  )}
                </button>
              ))}
            </div>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
