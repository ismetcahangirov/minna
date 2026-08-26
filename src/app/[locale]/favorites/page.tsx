import type { Metadata } from "next";
import { Heart } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { FavoritesList } from "@/components/favorites/favorites-list";
import { signInWithGoogle } from "@/lib/auth/actions";
import { getCurrentUser } from "@/lib/auth/session";
import { listFavorites } from "@/lib/favorites/queries";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("browse.favorites");
  const title = `${t("title")} — Minna`;
  const description = t("subtitle");

  return {
    title,
    description,
    // Per-user and auth-gated — keep it out of the index.
    robots: { index: false, follow: false },
    alternates: { canonical: "/favorites" },
  };
}

/**
 * Favorites page (LIST-04) — available only to signed-in users. When signed out
 * it renders a sign-in prompt (the Google flow, EPIC-02); when signed in the
 * first page is server-rendered and the {@link FavoritesList} client island
 * takes over for infinite scroll.
 */
export default async function FavoritesPage() {
  const t = await getTranslations("browse.favorites");
  const user = await getCurrentUser();

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-24 pb-16 sm:px-6 sm:pt-28 lg:px-8">
      <header className="mb-8 flex flex-col gap-2">
        <h1 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          {t("heading")}
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm sm:text-base">
          {t("subtitle")}
        </p>
      </header>

      {user?.id ? (
        <FavoritesList initialPage={await listFavorites(user.id, 1)} />
      ) : (
        <div className="text-muted-foreground flex flex-col items-center gap-4 py-20 text-center">
          <Heart className="text-muted-foreground/70 size-10" aria-hidden />
          <p className="text-foreground text-lg font-medium">
            {t("signedOutTitle")}
          </p>
          <p className="max-w-sm text-sm">{t("signedOutHint")}</p>
          <form action={signInWithGoogle} className="mt-2">
            <Button type="submit">{t("signIn")}</Button>
          </form>
        </div>
      )}
    </main>
  );
}
