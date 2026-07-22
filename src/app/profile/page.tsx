import type { Metadata } from "next";
import { UserRound } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { FavoritesPreview } from "@/components/profile/favorites-preview";
import { ProfileBackground } from "@/components/profile/profile-background";
import { ProfileInfo } from "@/components/profile/profile-info";
import { WatchHistoryPreview } from "@/components/profile/watch-history-preview";
import { Button } from "@/components/ui/button";
import { signInWithGoogle } from "@/lib/auth/actions";
import { getCurrentUser } from "@/lib/auth/session";
import { listFavorites } from "@/lib/favorites/queries";
import { getUserProfile } from "@/lib/user/queries";
import { listRecentWatchHistory } from "@/lib/watch/queries";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("profile");
  return {
    title: `${t("title")} — Minna`,
    description: t("subtitle"),
    // Per-user and auth-gated — keep it out of the index.
    robots: { index: false, follow: false },
    alternates: { canonical: "/profile" },
  };
}

/** How many items each quick view shows (one row). */
const PREVIEW_COUNT = 6;

/**
 * Profile page (EPIC-09). Route-protected by `src/proxy.ts`, but it also gates
 * on the session so a direct render shows a sign-in prompt rather than erroring.
 * When signed in it reads the account row from Neon (so an edit reflects at
 * once, ahead of the JWT refresh) alongside the watch-history and favorites
 * quick views, over the atmospheric background (PROFILE-02). The name editor is
 * the only client island.
 */
export default async function ProfilePage() {
  const t = await getTranslations("profile");
  const user = await getCurrentUser();

  if (!user?.id) {
    return (
      <>
        <ProfileBackground />
        <main className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-4 py-28 text-center">
          <UserRound className="text-muted-foreground/70 size-10" aria-hidden />
          <p className="text-foreground mt-4 text-lg font-medium">
            {t("signedOutTitle")}
          </p>
          <p className="text-muted-foreground mt-1 max-w-sm text-sm">
            {t("signedOutHint")}
          </p>
          <form action={signInWithGoogle} className="mt-4">
            <Button type="submit">{t("signIn")}</Button>
          </form>
        </main>
      </>
    );
  }

  const [profile, history, favorites] = await Promise.all([
    getUserProfile(user.id),
    listRecentWatchHistory(user.id, PREVIEW_COUNT),
    listFavorites(user.id, 1),
  ]);

  const info = {
    name: profile?.name ?? user.name ?? user.email ?? "",
    email: profile?.email ?? user.email ?? "",
    image: profile?.image ?? user.image ?? null,
    role: profile?.role ?? user.role ?? "user",
    createdAt: profile?.createdAt ?? null,
  };

  return (
    <>
      <ProfileBackground />
      <main className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-4 pt-24 pb-16 sm:px-6 sm:pt-28 lg:px-8">
        <header className="flex flex-col gap-1">
          <h1 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
            {t("heading")}
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            {t("subtitle")}
          </p>
        </header>

        <ProfileInfo profile={info} />
        <WatchHistoryPreview items={history} />
        <FavoritesPreview items={favorites.items.slice(0, PREVIEW_COUNT)} />
      </main>
    </>
  );
}
