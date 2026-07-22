import type { Metadata } from "next";
import { Plus } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { BlogsTable } from "@/components/admin/blog/blogs-table";
import { Button } from "@/components/ui/button";
import { listAdminBlogs } from "@/lib/admin/blog/queries";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.blogs");
  return {
    title: `${t("title")} — Minna`,
    robots: { index: false, follow: false },
  };
}

/** Blog management landing (ADMIN-05): all posts with create/edit/delete. */
export default async function AdminBlogsPage() {
  const t = await getTranslations("admin.blogs");
  const posts = await listAdminBlogs();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-foreground text-2xl font-bold tracking-tight">
            {t("title")}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{t("subtitle")}</p>
        </div>
        <Button nativeButton={false} render={<Link href="/admin/blogs/new" />}>
          <Plus className="size-4" aria-hidden />
          {t("new")}
        </Button>
      </header>

      <BlogsTable posts={posts} />
    </div>
  );
}
