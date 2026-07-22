"use client";

import { Newspaper } from "lucide-react";
import { useTranslations } from "next-intl";

import { BlogCard, BlogCardSkeleton } from "@/components/blog/blog-card";
import { InfinitePagedGrid } from "@/components/browse/infinite-paged-grid";
import type { BlogSummary } from "@/lib/blog/types";
import type { PagedResult } from "@/lib/browse/types";
import { useGetBlogPageQuery } from "@/store/api/browse-api";

const GRID_CLASS =
  "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

interface BlogListProps {
  initialPage: PagedResult<BlogSummary>;
}

/**
 * Client island for the Blogs page (LIST-03): vertical blog cards with infinite
 * scroll. The server seeds `initialPage`; the shared {@link InfinitePagedGrid}
 * streams in further pages.
 */
export function BlogList({ initialPage }: BlogListProps) {
  const t = useTranslations("browse");

  return (
    <InfinitePagedGrid<BlogSummary>
      initialPage={initialPage}
      usePage={useGetBlogPageQuery}
      getKey={(blog) => blog.id}
      gridClassName={GRID_CLASS}
      skeletonCount={8}
      renderItem={(blog, index) => (
        <BlogCard blog={blog} priority={index < 4} />
      )}
      renderSkeleton={() => <BlogCardSkeleton />}
      statusIcon={<Newspaper className="size-8" aria-hidden />}
      labels={{
        empty: t("blogs.empty"),
        emptyHint: t("blogs.emptyHint"),
        error: t("errorTitle"),
        retry: t("retry"),
        endOfList: t("endOfList"),
      }}
    />
  );
}
