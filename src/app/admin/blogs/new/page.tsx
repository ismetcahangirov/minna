import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { BlogForm } from "@/components/admin/blog/blog-form";
import { createBlogAction } from "@/lib/admin/blog/actions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.blogs");
  return {
    title: `${t("newTitle")} — Minna`,
    robots: { index: false, follow: false },
  };
}

/** Create-post form page (ADMIN-05). */
export default async function NewBlogPage() {
  const t = await getTranslations("admin.blogs");

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-foreground text-2xl font-bold tracking-tight">
          {t("newTitle")}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("newSubtitle")}</p>
      </header>

      <BlogForm action={createBlogAction} submitKey="create" />
    </div>
  );
}
