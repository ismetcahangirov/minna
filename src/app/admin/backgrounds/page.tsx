import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { BackgroundSlot } from "@/components/admin/backgrounds/background-slot";
import { listBackgroundOverrides } from "@/lib/admin/backgrounds/queries";
import {
  BACKGROUND_PAGES,
  BACKGROUND_PAGE_VARIANTS,
} from "@/lib/backgrounds/config";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.backgrounds");
  return {
    title: `${t("title")} — Minna`,
    robots: { index: false, follow: false },
  };
}

/**
 * Per-page background management (ADMIN-04). Each page lists its breakpoint
 * variants; a slot is either on its built-in default or an admin override.
 * Defaults are never stored, so clearing an override safely reverts to it.
 */
export default async function AdminBackgroundsPage() {
  const t = await getTranslations("admin.backgrounds");
  const overrides = await listBackgroundOverrides();
  const byKey = new Map(
    overrides.map((row) => [`${row.page}:${row.variant}`, row]),
  );

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-foreground text-2xl font-bold tracking-tight">
          {t("title")}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("subtitle")}</p>
      </header>

      <div className="flex flex-col gap-8">
        {BACKGROUND_PAGES.map((page) => (
          <section key={page} className="flex flex-col gap-3">
            <h2 className="text-foreground text-lg font-semibold tracking-tight">
              {t(`pages.${page}`)}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {BACKGROUND_PAGE_VARIANTS[page].map((variant) => {
                const row = byKey.get(`${page}:${variant}`);
                return (
                  <BackgroundSlot
                    key={variant}
                    page={page}
                    variant={variant}
                    current={
                      row
                        ? { videoUrl: row.videoUrl, active: row.active }
                        : null
                    }
                  />
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
