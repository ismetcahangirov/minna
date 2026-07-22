import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/auth/admin";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return {
    title: `${t("title")} — Minna`,
    // The admin panel is private — never index it.
    robots: { index: false, follow: false },
  };
}

/**
 * Admin panel layout (ADMIN-01). Re-checks the admin role server-side on every
 * request (`requireAdmin` redirects otherwise), then renders the responsive
 * shell. This is the second RBAC layer after the proxy; each admin action adds
 * a third check of its own.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();

  return (
    <AdminShell user={{ name: user.name, email: user.email }}>
      {children}
    </AdminShell>
  );
}
