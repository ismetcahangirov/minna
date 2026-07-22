import { Pencil } from "lucide-react";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";

import { DeleteBlogButton } from "@/components/admin/blog/delete-blog-button";
import type { Blog } from "@/db/schema";
import { setBlogPublishedAction } from "@/lib/admin/blog/actions";
import { cn } from "@/lib/utils";

/**
 * Admin blog listing (ADMIN-05): every post (drafts included) with an inline
 * publish toggle and edit/delete. Server-rendered; the toggle and delete run
 * through role-checked server actions.
 */
export async function BlogsTable({ posts }: { posts: Blog[] }) {
  const [t, format] = await Promise.all([
    getTranslations("admin.blogs"),
    getFormatter(),
  ]);

  if (posts.length === 0) {
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
        {posts.map((post) => (
          <li key={post.id} className="border-border border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-foreground truncate font-medium">
                  {post.title}
                </p>
                <p className="text-muted-foreground truncate text-xs">
                  /{post.slug}
                </p>
              </div>
              <form
                action={setBlogPublishedAction.bind(
                  null,
                  post.id,
                  post.slug,
                  !post.published,
                )}
              >
                <button
                  type="submit"
                  className={cn(
                    "shrink-0 px-2 py-1 text-xs font-semibold tracking-wide uppercase transition-colors",
                    post.published
                      ? "bg-primary text-primary-foreground hover:bg-primary/80"
                      : "bg-muted text-muted-foreground hover:text-foreground",
                  )}
                >
                  {post.published ? t("published") : t("draft")}
                </button>
              </form>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-muted-foreground text-xs whitespace-nowrap">
                {format.dateTime(post.publishedAt, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
              <div className="flex items-center gap-1">
                <Link
                  href={`/admin/blogs/${post.id}/edit`}
                  aria-label={t("edit")}
                  className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex size-8 items-center justify-center transition-colors"
                >
                  <Pencil className="size-4" aria-hidden />
                </Link>
                <DeleteBlogButton
                  id={post.id}
                  slug={post.slug}
                  title={post.title}
                />
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* Tablet/desktop (md+): full table, still scrollable if the rail narrows it */}
      <div className="border-border hidden overflow-x-auto border md:block">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-border text-muted-foreground border-b text-left text-xs tracking-wide uppercase">
              <th className="px-4 py-3 font-medium">{t("fields.title")}</th>
              <th className="px-4 py-3 font-medium">{t("fields.date")}</th>
              <th className="px-4 py-3 font-medium">{t("status")}</th>
              <th className="px-4 py-3 text-right font-medium">
                {t("actions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr
                key={post.id}
                className="border-border/60 hover:bg-muted/30 border-b last:border-0"
              >
                <td className="max-w-[360px] px-4 py-3">
                  <p className="text-foreground truncate font-medium">
                    {post.title}
                  </p>
                  <p className="text-muted-foreground truncate text-xs">
                    /{post.slug}
                  </p>
                </td>
                <td className="text-muted-foreground px-4 py-3 whitespace-nowrap">
                  {format.dateTime(post.publishedAt, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </td>
                <td className="px-4 py-3">
                  <form
                    action={setBlogPublishedAction.bind(
                      null,
                      post.id,
                      post.slug,
                      !post.published,
                    )}
                  >
                    <button
                      type="submit"
                      className={cn(
                        "px-2 py-1 text-xs font-semibold tracking-wide uppercase transition-colors",
                        post.published
                          ? "bg-primary text-primary-foreground hover:bg-primary/80"
                          : "bg-muted text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {post.published ? t("published") : t("draft")}
                    </button>
                  </form>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/admin/blogs/${post.id}/edit`}
                      aria-label={t("edit")}
                      className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex size-8 items-center justify-center transition-colors"
                    >
                      <Pencil className="size-4" aria-hidden />
                    </Link>
                    <DeleteBlogButton
                      id={post.id}
                      slug={post.slug}
                      title={post.title}
                    />
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
