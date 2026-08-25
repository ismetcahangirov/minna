import type { Metadata } from "next";
import { Library as LibraryIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { LibraryCard } from "@/components/library/library-card";
import { LibraryTabs } from "@/components/library/library-tabs";
import { VisibilityToggle } from "@/components/library/visibility-toggle";
import { Button } from "@/components/ui/button";
import { SimplePager } from "@/components/ui/simple-pager";
import { signInWithGoogle } from "@/lib/auth/actions";
import { getCurrentUser } from "@/lib/auth/session";
import { getLibraryCounts, listLibrary } from "@/lib/library/queries";
import { isLibraryStatus, type LibraryStatus } from "@/lib/library/types";
import { getUserVisibility } from "@/lib/members/queries";

interface LibraryRouteProps {
  searchParams: Promise<{ status?: string; page?: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("library");
  return {
    title: `${t("title")} — Minna`,
    description: t("subtitle"),
    // Per-member and auth-gated — keep it out of the index.
    robots: { index: false, follow: false },
    alternates: { canonical: "/library" },
  };
}

/** Reads `?page=`, falling back to the first page for anything unparseable. */
function parsePage(raw: string | undefined): number {
  if (!raw || !/^\d+$/.test(raw)) return 1;
  return Math.max(1, Number.parseInt(raw, 10));
}

/**
 * The member's library (LIB-03) — everything they have watched, filed on five
 * shelves, each entry carrying the progress bar its watched-episode counter
 * feeds.
 *
 * Signed out it shows the Google sign-in prompt rather than erroring, matching
 * the Favorites page. Signed in it costs two queries: one page of entries and
 * one grouped count for the tabs. The shelf and the page both live in the URL,
 * so a view is bookmarkable and no client state is involved.
 */
export default async function LibraryPage({ searchParams }: LibraryRouteProps) {
  const t = await getTranslations("library");
  const params = await searchParams;
  const user = await getCurrentUser();

  if (!user?.id) {
    return (
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-24 pb-16 sm:px-6 sm:pt-28 lg:px-8">
        <div className="text-muted-foreground flex flex-col items-center gap-4 py-20 text-center">
          <LibraryIcon
            className="text-muted-foreground/70 size-10"
            aria-hidden
          />
          <p className="text-foreground text-lg font-medium">
            {t("signedOutTitle")}
          </p>
          <p className="max-w-sm text-sm">{t("signedOutHint")}</p>
          <form action={signInWithGoogle} className="mt-2">
            <Button type="submit">{t("signIn")}</Button>
          </form>
        </div>
      </main>
    );
  }

  const status: LibraryStatus | null =
    params.status && isLibraryStatus(params.status) ? params.status : null;
  const page = parsePage(params.page);

  const [entries, counts, visibility] = await Promise.all([
    listLibrary(user.id, { status, page }),
    getLibraryCounts(user.id),
    getUserVisibility(user.id),
  ]);

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-24 pb-16 sm:px-6 sm:pt-28 lg:px-8">
      <header className="mb-6 flex flex-col gap-2">
        <h1 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          {t("heading")}
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm sm:text-base">
          {t("subtitle")}
        </p>
        <VisibilityToggle isPublic={visibility} />
      </header>

      <LibraryTabs active={status} counts={counts} basePath="/library" />

      {entries.items.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center gap-3 py-20 text-center">
          <LibraryIcon
            className="text-muted-foreground/70 size-10"
            aria-hidden
          />
          <p className="text-foreground text-lg font-medium">{t("empty")}</p>
          <p className="max-w-sm text-sm">{t("emptyHint")}</p>
        </div>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          {entries.items.map((entry, index) => (
            <li key={entry.animeId}>
              <LibraryCard entry={entry} priority={index < 6} />
            </li>
          ))}
        </ul>
      )}

      <SimplePager
        basePath="/library"
        page={entries.page}
        hasNextPage={entries.hasNextPage}
        params={{ status }}
      />
    </main>
  );
}
