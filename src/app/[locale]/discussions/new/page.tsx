import type { Metadata } from "next";
import { ChevronLeft, MessagesSquare } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { NewThreadForm } from "@/components/community/new-thread-form";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { signInWithGoogle } from "@/lib/auth/actions";
import { getCurrentUser } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("community");
  return {
    title: `${t("newHeading")} — Minna`,
    description: t("newSubtitle"),
    // A form, not content — nothing here belongs in the index.
    robots: { index: false, follow: true },
    alternates: { canonical: "/discussions/new" },
  };
}

/**
 * The page a discussion is opened from (COMM-01).
 *
 * Signed out it shows the Google sign-in prompt rather than a form that could
 * not be submitted; signed in it renders the picker-and-post form, which does
 * the catalog lookups itself, on demand.
 */
export default async function NewDiscussionPage() {
  const t = await getTranslations("community");
  const user = await getCurrentUser();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-24 pb-16 sm:px-6 sm:pt-28 lg:px-8">
      <Link
        href="/discussions"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
      >
        <ChevronLeft className="size-4" aria-hidden />
        {t("backToList")}
      </Link>

      <header className="mt-4 mb-8 flex flex-col gap-2">
        <h1 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          {t("newHeading")}
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          {t("newSubtitle")}
        </p>
      </header>

      {user?.id ? (
        <NewThreadForm />
      ) : (
        <div className="text-muted-foreground flex flex-col items-center gap-4 py-16 text-center">
          <MessagesSquare
            className="text-muted-foreground/70 size-10"
            aria-hidden
          />
          <p className="text-foreground text-lg font-medium">
            {t("signInToPost")}
          </p>
          <form action={signInWithGoogle} className="mt-2">
            <Button type="submit">{t("signIn")}</Button>
          </form>
        </div>
      )}
    </main>
  );
}
