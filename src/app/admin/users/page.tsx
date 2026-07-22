import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { UsersTable } from "@/components/admin/users/users-table";
import { requireAdmin } from "@/lib/auth/admin";
import { listAdminUsers } from "@/lib/admin/users/queries";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.users");
  return {
    title: `${t("title")} — Minna`,
    robots: { index: false, follow: false },
  };
}

/** User management landing (ADMIN-06): list, block/unblock and delete users. */
export default async function AdminUsersPage() {
  const [t, admin, users] = await Promise.all([
    getTranslations("admin.users"),
    requireAdmin(),
    listAdminUsers(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-foreground text-2xl font-bold tracking-tight">
          {t("title")}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("subtitle")}</p>
      </header>

      <UsersTable users={users} currentUserId={admin.id ?? ""} />
    </div>
  );
}
