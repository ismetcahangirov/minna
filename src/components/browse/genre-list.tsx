"use client";

import { Tags } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  AnimePosterCard,
  AnimePosterCardSkeleton,
} from "@/components/anime/anime-poster-card";
import { InfinitePagedGrid } from "@/components/browse/infinite-paged-grid";
import type { AnimeSummary } from "@/lib/anime/types";
import type { PagedResult } from "@/lib/browse/types";
import { useGetGenrePageQuery } from "@/store/api/browse-api";

const GRID_CLASS =
  "grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6";

interface GenreListProps {
  slug: string;
  initialPage: PagedResult<AnimeSummary>;
}

export function GenreList({ slug, initialPage }: GenreListProps) {
  const t = useTranslations("browse");

  return (
    <InfinitePagedGrid<AnimeSummary, { slug: string; page: number }>
      initialPage={initialPage}
      usePage={useGetGenrePageQuery}
      getPageArg={(page) => ({ slug, page })}
      getKey={(anime) => anime.id}
      gridClassName={GRID_CLASS}
      renderItem={(anime, index) => (
        <AnimePosterCard anime={anime} priority={index < 6} />
      )}
      renderSkeleton={() => <AnimePosterCardSkeleton />}
      statusIcon={<Tags className="size-8" aria-hidden />}
      labels={{
        empty: t("genre.empty"),
        emptyHint: t("genre.emptyHint"),
        error: t("errorTitle"),
        retry: t("retry"),
        endOfList: t("endOfList"),
      }}
    />
  );
}
