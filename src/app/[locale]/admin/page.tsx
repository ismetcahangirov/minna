import type { Metadata } from "next";
import { FileText, Megaphone, Users } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { StatCard } from "@/components/admin/stat-card";
import { getAdminOverview } from "@/lib/admin/stats";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return {
    title: `${t("nav.dashboard")} — ${t("title")}`,
    robots: { index: false, follow: false },
  };
}

/**
 * Admin dashboard landing (ADMIN-01): headline platform counts over the admin
 * shell. The grid grows as later modules add their own views.
 */
export default async function AdminDashboardPage() {
  const [t, locale, overview] = await Promise.all([
    getTranslations("admin.dashboard"),
    getLocale(),
    getAdminOverview(),
  ]);
  const nf = new Intl.NumberFormat(locale);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-foreground text-2xl font-bold tracking-tight">
          {t("heading")}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("subtitle")}</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label={t("users")}
          value={nf.format(overview.users)}
          icon={Users}
        />
        <StatCard
          label={t("blogs")}
          value={nf.format(overview.blogs)}
          icon={FileText}
        />
        <StatCard
          label={t("ads")}
          value={nf.format(overview.ads)}
          icon={Megaphone}
        />
      </section>
    </div>
  );
}
