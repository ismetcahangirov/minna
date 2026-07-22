"use client";

import { HeartOff } from "lucide-react";
import { useTranslations } from "next-intl";

import { InfinitePagedGrid } from "@/components/browse/infinite-paged-grid";
import { FavoriteCard } from "@/components/favorites/favorite-card";
import type { PagedResult } from "@/lib/browse/types";
import type { FavoriteItem } from "@/lib/favorites/types";
import { useGetFavoritesPageQuery } from "@/store/api/browse-api";

const GRID_CLASS =
  "grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6";

interface FavoritesListProps {
  initialPage: PagedResult<FavoriteItem>;
}

/**
 * Client island for the Favorites page (LIST-04): vertical cards with infinite
 * scroll. The server seeds `initialPage` (already auth-gated by the page); the
 * shared {@link InfinitePagedGrid} streams in further pages.
 */
export function FavoritesList({ initialPage }: FavoritesListProps) {
  const t = useTranslations("browse");

  return (
    <InfinitePagedGrid<FavoriteItem>
      initialPage={initialPage}
      usePage={useGetFavoritesPageQuery}
      getKey={(favorite) => favorite.animeId}
      gridClassName={GRID_CLASS}
      renderItem={(favorite, index) => (
        <FavoriteCard favorite={favorite} priority={index < 6} />
      )}
      renderSkeleton={() => (
        <div className="bg-surface border-border aspect-[2/3] w-full animate-pulse border" />
      )}
      statusIcon={<HeartOff className="size-8" aria-hidden />}
      labels={{
        empty: t("favorites.empty"),
        emptyHint: t("favorites.emptyHint"),
        error: t("errorTitle"),
        retry: t("retry"),
        endOfList: t("endOfList"),
      }}
    />
  );
}
