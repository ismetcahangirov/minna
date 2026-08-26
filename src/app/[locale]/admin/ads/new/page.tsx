import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { AdForm } from "@/components/admin/ads/ad-form";
import { createAdAction } from "@/lib/admin/ads/actions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.ads");
  return {
    title: `${t("newTitle")} — Minna`,
    robots: { index: false, follow: false },
  };
}

/** Create-ad form page (ADMIN-02). */
export default async function NewAdPage() {
  const t = await getTranslations("admin.ads");

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-foreground text-2xl font-bold tracking-tight">
          {t("newTitle")}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("newSubtitle")}</p>
      </header>

      <AdForm action={createAdAction} submitKey="create" />
    </div>
  );
}
