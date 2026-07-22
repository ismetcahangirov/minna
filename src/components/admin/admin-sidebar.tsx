"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { ADMIN_NAV } from "@/components/admin/admin-nav";
import { signOutUser } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";

export interface AdminSidebarUser {
  name?: string | null;
  email?: string | null;
}

interface AdminSidebarProps {
  user: AdminSidebarUser;
  /** Called after a nav link is chosen — closes the mobile drawer. */
  onNavigate?: () => void;
}

/**
 * The admin panel's primary navigation (ADMIN-01): brand, section links with an
 * active state, and the signed-in admin plus a sign-out action. Rendered both as
 * the fixed desktop rail and inside the mobile drawer (see `AdminShell`). Sharp
 * corners, high contrast, red active state — admin design system.
 */
export function AdminSidebar({ user, onNavigate }: AdminSidebarProps) {
  const pathname = usePathname();
  const t = useTranslations("admin");

  return (
    <div className="bg-sidebar text-sidebar-foreground border-sidebar-border flex h-full w-64 flex-col border-r">
      <div className="border-sidebar-border flex h-16 items-center gap-2.5 border-b px-5">
        <span className="bg-sidebar-primary size-2.5" aria-hidden />
        <span className="text-sm font-semibold tracking-wide uppercase">
          {t("title")}
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="flex flex-col gap-1">
          {ADMIN_NAV.map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  {t(`nav.${item.key}`)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-sidebar-border border-t p-3">
        <div className="mb-2 px-2">
          <p className="truncate text-sm font-medium">
            {user.name ?? user.email}
          </p>
          {user.name && user.email && (
            <p className="text-sidebar-foreground/60 truncate text-xs">
              {user.email}
            </p>
          )}
        </div>
        <form action={signOutUser}>
          <button
            type="submit"
            className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground flex w-full items-center gap-3 px-3 py-2 text-sm font-medium transition-colors"
          >
            <LogOut className="size-4" aria-hidden />
            {t("signOut")}
          </button>
        </form>
      </div>
    </div>
  );
}
