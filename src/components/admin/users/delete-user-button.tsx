"use client";

import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { deleteUserAction } from "@/lib/admin/users/actions";

/**
 * Deletes a user from the list row (ADMIN-06) behind a confirmation prompt. The
 * server action is bound to the id, re-checks the admin role, and refuses
 * self-deletion.
 */
export function DeleteUserButton({ id, name }: { id: string; name: string }) {
  const t = useTranslations("admin.users");

  return (
    <form
      action={deleteUserAction.bind(null, id)}
      onSubmit={(event) => {
        if (!window.confirm(t("confirmDelete", { name }))) {
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
