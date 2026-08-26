import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { AdForm } from "@/components/admin/ads/ad-form";
import { updateAdAction } from "@/lib/admin/ads/actions";
import { getAdminAd } from "@/lib/admin/ads/queries";

interface EditAdRouteProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.ads");
  return {
    title: `${t("editTitle")} — Minna`,
    robots: { index: false, follow: false },
  };
}

/** Edit-ad form page (ADMIN-02). 404s when the ad no longer exists. */
export default async function EditAdPage({ params }: EditAdRouteProps) {
  const { id } = await params;
  const [t, ad] = await Promise.all([
    getTranslations("admin.ads"),
    getAdminAd(id),
  ]);

  if (!ad) notFound();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-foreground text-2xl font-bold tracking-tight">
          {t("editTitle")}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {t("editSubtitle")}
        </p>
      </header>

      <AdForm
        action={updateAdAction.bind(null, ad.id)}
        submitKey="save"
        defaultValues={{
          title: ad.title,
          videoUrl: ad.videoUrl,
          targetUrl: ad.targetUrl ?? "",
          durationSeconds: ad.durationSeconds?.toString() ?? "",
          skipAfterSeconds: ad.skipAfterSeconds.toString(),
          weight: ad.weight.toString(),
          active: ad.active,
        }}
      />
    </div>
  );
}
