import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { BlogForm } from "@/components/admin/blog/blog-form";
import { updateBlogAction } from "@/lib/admin/blog/actions";
import {
  getAdminBlog,
  getAdminBlogTagNames,
  listAdminBlogTags,
  listBlogMedia,
  listBlogTranslationTargets,
} from "@/lib/admin/blog/queries";

interface EditBlogRouteProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.blogs");
  return {
    title: `${t("editTitle")} — Minna`,
    robots: { index: false, follow: false },
  };
}

/** Edit-post form page (ADMIN-05). 404s when the post no longer exists. */
export default async function EditBlogPage({ params }: EditBlogRouteProps) {
  const { id } = await params;
  const [t, post, library, tags] = await Promise.all([
    getTranslations("admin.blogs"),
    getAdminBlog(id),
    listBlogMedia(),
    listAdminBlogTags(),
  ]);

  if (!post) notFound();

  const [postTags, translationTargets] = await Promise.all([
    getAdminBlogTagNames(post.id),
    listBlogTranslationTargets(post.id),
  ]);
  // Preselect the group only when something else is actually in it; a group of
  // one is what "standalone" means, and showing it selected would suggest the
  // post is tied to a sibling that does not exist.
  const linked = translationTargets.some(
    (target) => target.groupId === post.translationGroupId,
  );

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

      <BlogForm
        action={updateBlogAction.bind(null, post.id, post.slug)}
        submitKey="save"
        library={library}
        tagSuggestions={tags.map((tag) => tag.name)}
        translationTargets={translationTargets}
        defaultValues={{
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt ?? "",
          content: post.content,
          coverImage: post.coverImage ?? "",
          coverImageAlt: post.coverImageAlt ?? "",
          author: post.author ?? "",
          authorUrl: post.authorUrl ?? "",
          language: post.language,
          translationGroupId: linked ? post.translationGroupId : "",
          tags: postTags.join(", "),
          published: post.published,
        }}
      />
    </div>
  );
}
