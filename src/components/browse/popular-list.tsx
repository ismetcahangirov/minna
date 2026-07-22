"use client";

import { Flame } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  AnimePosterCard,
  AnimePosterCardSkeleton,
} from "@/components/anime/anime-poster-card";
import { InfinitePagedGrid } from "@/components/browse/infinite-paged-grid";
import type { AnimeSummary } from "@/lib/anime/types";
import type { PagedResult } from "@/lib/browse/types";
import { useGetPopularPageQuery } from "@/store/api/browse-api";

const GRID_CLASS =
  "grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6";

interface PopularListProps {
  initialPage: PagedResult<AnimeSummary>;
}

/**
 * Client island for the Popular page (LIST-02): vertical anime cards with
 * infinite scroll. The server seeds `initialPage`; further pages stream in
 * through the shared {@link InfinitePagedGrid}.
 */
export function PopularList({ initialPage }: PopularListProps) {
  const t = useTranslations("browse");

  return (
    <InfinitePagedGrid<AnimeSummary>
      initialPage={initialPage}
      usePage={useGetPopularPageQuery}
      getKey={(anime) => anime.id}
      gridClassName={GRID_CLASS}
      renderItem={(anime, index) => (
        <AnimePosterCard anime={anime} priority={index < 6} />
      )}
      renderSkeleton={() => <AnimePosterCardSkeleton />}
      statusIcon={<Flame className="size-8" aria-hidden />}
      labels={{
        empty: t("popular.empty"),
        emptyHint: t("popular.emptyHint"),
        error: t("errorTitle"),
        retry: t("retry"),
        endOfList: t("endOfList"),
      }}
    />
  );
}
