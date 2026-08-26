import type { Metadata } from "next";
import { MessagesSquare, Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ThreadCard } from "@/components/community/thread-card";
import { Button } from "@/components/ui/button";
import { SimplePager } from "@/components/ui/simple-pager";
import { Link } from "@/i18n/navigation";
import { listThreads } from "@/lib/discussions/queries";

interface DiscussionsRouteProps {
  searchParams: Promise<{ page?: string; anime?: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("community");
  return {
    title: `${t("title")} — Minna`,
    description: t("subtitle"),
    alternates: { canonical: "/discussions" },
  };
}

/** Reads `?page=`, falling back to the first page for anything unparseable. */
function parsePage(raw: string | undefined): number {
  if (!raw || !/^\d+$/.test(raw)) return 1;
  return Math.max(1, Number.parseInt(raw, 10));
}

/**
 * The community page (COMM-03): every discussion on the site, most recently
 * active first, and optionally narrowed to one anime with `?anime=`.
 *
 * Server-rendered and public — a conversation about a series is worth indexing
 * — and it costs a single indexed query per page: the ordering comes off the
 * activity index and each row already carries its reply count and its anime's
 * title and art.
 */
export default async function DiscussionsPage({
  searchParams,
}: DiscussionsRouteProps) {
  const t = await getTranslations("community");
  const params = await searchParams;
  const page = parsePage(params.page);
  const animeId = params.anime?.trim() || null;

  const threads = await listThreads({ page, animeId });

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 pt-24 pb-16 sm:px-6 sm:pt-28 lg:px-8">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
            {t("heading")}
          </h1>
          <p className="text-muted-foreground max-w-2xl text-sm sm:text-base">
            {t("subtitle")}
          </p>
        </div>
        <Button
          size="lg"
          nativeButton={false}
          render={<Link href="/discussions/new" />}
        >
          <Plus aria-hidden />
          {t("newThread")}
        </Button>
      </header>

      {threads.items.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center gap-3 py-20 text-center">
          <MessagesSquare
            className="text-muted-foreground/70 size-10"
            aria-hidden
          />
          <p className="text-foreground text-lg font-medium">{t("empty")}</p>
          <p className="max-w-sm text-sm">{t("emptyHint")}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {threads.items.map((thread) => (
            <li key={thread.id}>
              <ThreadCard thread={thread} />
            </li>
          ))}
        </ul>
      )}

      <SimplePager
        basePath="/discussions"
        page={threads.page}
        hasNextPage={threads.hasNextPage}
        params={{ anime: animeId }}
      />
    </main>
  );
}
