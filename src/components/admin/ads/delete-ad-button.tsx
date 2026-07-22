"use client";

import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { deleteAdAction } from "@/lib/admin/ads/actions";

/**
 * Deletes an ad from the list row (ADMIN-02) behind a confirmation prompt so a
 * misclick can't wipe a live ad. The server action is bound to the id and
 * re-checks the admin role itself.
 */
export function DeleteAdButton({ id, title }: { id: string; title: string }) {
  const t = useTranslations("admin.ads");

  return (
    <form
      action={deleteAdAction.bind(null, id)}
      onSubmit={(event) => {
        if (!window.confirm(t("confirmDelete", { title }))) {
          event.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        aria-label={t("delete")}
        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive inline-flex size-8 items-center justify-center transition-colors"
      >
        <Trash2 className="size-4" aria-hidden />
      </button>
    </form>
  );
}
