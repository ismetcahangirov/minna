import { ArrowRight, Heart } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { FavoriteCard } from "@/components/favorites/favorite-card";
import type { FavoriteItem } from "@/lib/favorites/types";

/**
 * Favorites quick view for the profile page (PROFILE-03). Shows the first row
 * of the user's saved anime (reusing {@link FavoriteCard}) with a link through
 * to the full Favorites page (EPIC-08). Server component — presentational only.
 */
export async function FavoritesPreview({ items }: { items: FavoriteItem[] }) {
  const t = await getTranslations("profile.favorites");

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-foreground text-xl font-bold tracking-tight">
          {t("title")}
        </h2>
        {items.length > 0 && (
          <Link
            href="/favorites"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
          >
            {t("seeAll")}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        )}
      </div>

      {items.length === 0 ? (
        <div className="border-border text-muted-foreground flex flex-col items-center gap-3 border border-dashed py-12 text-center">
          <Heart className="size-8" aria-hidden />
          <p className="text-foreground text-base font-medium">{t("empty")}</p>
          <p className="max-w-sm text-sm">{t("emptyHint")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {items.map((favorite, index) => (
            <FavoriteCard
              key={favorite.animeId}
              favorite={favorite}
              priority={index < 6}
            />
          ))}
        </div>
      )}
    </section>
  );
}
