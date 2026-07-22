"use client";

import { Menu, X } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";

import {
  AdminSidebar,
  type AdminSidebarUser,
} from "@/components/admin/admin-sidebar";

interface AdminShellProps {
  user: AdminSidebarUser;
  children: React.ReactNode;
}

/**
 * Responsive chrome for the admin panel (ADMIN-01). A fixed sidebar rail on
 * desktop; on mobile the rail collapses into a slide-over drawer opened from a
 * top bar (mirroring the `admin_sehifesi_mobil_ucun.mov` interaction). The
 * public site header is suppressed on `/admin` (see `HeaderGate`), so this owns
 * the whole viewport.
 */
export function AdminShell({ user, children }: AdminShellProps) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("admin");

  return (
    <div className="flex flex-1">
      {/* Desktop rail */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden lg:block">
        <AdminSidebar user={user} />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label={t("closeMenu")}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/70"
          />
          <div className="absolute inset-y-0 left-0 shadow-xl">
            <button
              type="button"
              aria-label={t("closeMenu")}
              onClick={() => setOpen(false)}
              className="text-sidebar-foreground hover:bg-sidebar-accent absolute top-4 right-3 z-10 inline-flex size-8 items-center justify-center"
            >
              <X className="size-5" aria-hidden />
            </button>
            <AdminSidebar user={user} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        {/* Mobile top bar */}
        <div className="bg-sidebar border-sidebar-border sticky top-0 z-30 flex h-16 items-center gap-3 border-b px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={t("openMenu")}
            className="text-sidebar-foreground hover:bg-sidebar-accent inline-flex size-9 items-center justify-center"
          >
            <Menu className="size-5" aria-hidden />
          </button>
          <span className="text-sm font-semibold tracking-wide uppercase">
            {t("title")}
          </span>
        </div>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
