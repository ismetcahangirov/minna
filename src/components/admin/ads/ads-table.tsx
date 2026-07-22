import { Pencil } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { DeleteAdButton } from "@/components/admin/ads/delete-ad-button";
import type { Ad } from "@/db/schema";
import { setAdActiveAction } from "@/lib/admin/ads/actions";
import { cn } from "@/lib/utils";

/**
 * Admin ad listing (ADMIN-02): every ad with its skip/duration settings, an
 * inline active toggle, and edit/delete actions. Server-rendered; the toggle and
 * delete run through role-checked server actions.
 */
export async function AdsTable({ ads }: { ads: Ad[] }) {
  const t = await getTranslations("admin.ads");

  if (ads.length === 0) {
    return (
      <div className="border-border text-muted-foreground border border-dashed p-10 text-center text-sm">
        {t("empty")}
      </div>
    );
  }

  return (
    <>
      {/* Mobile (<md): stacked cards — the table would force horizontal scroll */}
      <ul className="flex flex-col gap-3 md:hidden">
        {ads.map((ad) => (
          <li key={ad.id} className="border-border border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-foreground truncate font-medium">
                  {ad.title}
                </p>
                <p className="text-muted-foreground truncate text-xs">
                  {ad.videoUrl}
                </p>
              </div>
              <form action={setAdActiveAction.bind(null, ad.id, !ad.active)}>
                <button
                  type="submit"
                  className={cn(
                    "shrink-0 px-2 py-1 text-xs font-semibold tracking-wide uppercase transition-colors",
                    ad.active
                      ? "bg-primary text-primary-foreground hover:bg-primary/80"
                      : "bg-muted text-muted-foreground hover:text-foreground",
                  )}
                >
                  {ad.active ? t("active") : t("inactive")}
                </button>
              </form>
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div>
                <dt className="text-muted-foreground tracking-wide uppercase">
                  {t("fields.skipAfterSeconds")}
                </dt>
                <dd className="text-foreground tabular-nums">
                  {t("seconds", { value: ad.skipAfterSeconds })}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground tracking-wide uppercase">
                  {t("fields.durationSeconds")}
                </dt>
                <dd className="text-foreground tabular-nums">
                  {ad.durationSeconds == null
                    ? t("full")
                    : t("seconds", { value: ad.durationSeconds })}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground tracking-wide uppercase">
                  {t("fields.weight")}
                </dt>
                <dd className="text-foreground tabular-nums">{ad.weight}</dd>
              </div>
            </dl>
            <div className="mt-3 flex items-center justify-end gap-1">
              <Link
                href={`/admin/ads/${ad.id}/edit`}
                aria-label={t("edit")}
                className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex size-8 items-center justify-center transition-colors"
              >
                <Pencil className="size-4" aria-hidden />
              </Link>
              <DeleteAdButton id={ad.id} title={ad.title} />
            </div>
          </li>
        ))}
      </ul>

      {/* Tablet/desktop (md+): full table, still scrollable if the rail narrows it */}
      <div className="border-border hidden overflow-x-auto border md:block">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-border text-muted-foreground border-b text-left text-xs tracking-wide uppercase">
              <th className="px-4 py-3 font-medium">{t("fields.title")}</th>
              <th className="px-4 py-3 font-medium">
                {t("fields.skipAfterSeconds")}
              </th>
              <th className="px-4 py-3 font-medium">
                {t("fields.durationSeconds")}
              </th>
              <th className="px-4 py-3 font-medium">{t("fields.weight")}</th>
              <th className="px-4 py-3 font-medium">{t("status")}</th>
              <th className="px-4 py-3 text-right font-medium">
                {t("actions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {ads.map((ad) => (
              <tr
                key={ad.id}
                className="border-border/60 hover:bg-muted/30 border-b last:border-0"
              >
                <td className="max-w-[280px] px-4 py-3">
                  <p className="text-foreground truncate font-medium">
                    {ad.title}
                  </p>
                  <p className="text-muted-foreground truncate text-xs">
                    {ad.videoUrl}
                  </p>
                </td>
                <td className="text-foreground px-4 py-3 tabular-nums">
                  {t("seconds", { value: ad.skipAfterSeconds })}
                </td>
                <td className="text-foreground px-4 py-3 tabular-nums">
                  {ad.durationSeconds == null
                    ? t("full")
                    : t("seconds", { value: ad.durationSeconds })}
                </td>
                <td className="text-foreground px-4 py-3 tabular-nums">
                  {ad.weight}
                </td>
                <td className="px-4 py-3">
                  <form
                    action={setAdActiveAction.bind(null, ad.id, !ad.active)}
                  >
                    <button
                      type="submit"
                      className={cn(
                        "px-2 py-1 text-xs font-semibold tracking-wide uppercase transition-colors",
                        ad.active
                          ? "bg-primary text-primary-foreground hover:bg-primary/80"
                          : "bg-muted text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {ad.active ? t("active") : t("inactive")}
                    </button>
                  </form>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/admin/ads/${ad.id}/edit`}
                      aria-label={t("edit")}
                      className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex size-8 items-center justify-center transition-colors"
                    >
                      <Pencil className="size-4" aria-hidden />
                    </Link>
                    <DeleteAdButton id={ad.id} title={ad.title} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
