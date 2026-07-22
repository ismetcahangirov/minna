import type { Metadata } from "next";
import { Plus } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { AdsTable } from "@/components/admin/ads/ads-table";
import { Button } from "@/components/ui/button";
import { listAdminAds } from "@/lib/admin/ads/queries";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.ads");
  return {
    title: `${t("title")} — Minna`,
    robots: { index: false, follow: false },
  };
}

/** Ad management landing (ADMIN-02): the full ad list with create/edit/delete. */
export default async function AdminAdsPage() {
  const t = await getTranslations("admin.ads");
  const ads = await listAdminAds();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-foreground text-2xl font-bold tracking-tight">
            {t("title")}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{t("subtitle")}</p>
        </div>
        <Button nativeButton={false} render={<Link href="/admin/ads/new" />}>
          <Plus className="size-4" aria-hidden />
          {t("new")}
        </Button>
      </header>

      <AdsTable ads={ads} />
    </div>
  );
}
