"use client";

import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { deleteBlogAction } from "@/lib/admin/blog/actions";

/**
 * Deletes a blog post from the list row (ADMIN-05) behind a confirmation prompt.
 * The server action is bound to the id/slug and re-checks the admin role.
 */
export function DeleteBlogButton({
  id,
  slug,
  title,
}: {
  id: string;
  slug: string;
  title: string;
}) {
  const t = useTranslations("admin.blogs");

  return (
    <form
      action={deleteBlogAction.bind(null, id, slug)}
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
