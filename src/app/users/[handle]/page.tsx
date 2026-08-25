import type { Metadata } from "next";
import {
  ChevronLeft,
  EyeOff,
  Library as LibraryIcon,
  UserRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";

import { LibraryCard } from "@/components/library/library-card";
import { LibraryTabs } from "@/components/library/library-tabs";
import { SimplePager } from "@/components/ui/simple-pager";
import { getMemberDiscussionStats } from "@/lib/discussions/queries";
import { getLibraryCounts, listLibrary } from "@/lib/library/queries";
import { isLibraryStatus, type LibraryStatus } from "@/lib/library/types";
import { getMemberByHandle } from "@/lib/members/queries";
import { memberHref } from "@/lib/members/types";

interface MemberRouteProps {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ status?: string; page?: string }>;
}

/** Reads `?page=`, falling back to the first page for anything unparseable. */
function parsePage(raw: string | undefined): number {
  if (!raw || !/^\d+$/.test(raw)) return 1;
  return Math.max(1, Number.parseInt(raw, 10));
}

export async function generateMetadata({
  params,
}: MemberRouteProps): Promise<Metadata> {
  const { handle } = await params;
  const member = await getMemberByHandle(handle);
  const t = await getTranslations("members");

  if (!member) return { title: `${t("notFound")} — Minna` };

  return {
    title: `${member.name} — Minna`,
    description: t("subtitle"),
    // A member's own page: reachable inside the site, kept out of search.
    robots: { index: false, follow: false },
    alternates: { canonical: memberHref(member) },
  };
}

/** One number in the profile's summary row. */
function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-border flex flex-col border px-4 py-3">
      <span className="text-foreground text-lg font-bold">{value}</span>
      <span className="text-muted-foreground text-xs tracking-wide uppercase">
        {label}
      </span>
    </div>
  );
}

/**
 * A member's public profile (MEM-03): who they are, what they have been
 * watching, and how active they are in the community.
 *
 * The library is shown only when its owner allows it — the directory makes
 * people findable, but what their profile reveals stays their decision. The
 * Google email backing the account is never read by any query behind this page.
 */
export default async function MemberProfilePage({
  params,
  searchParams,
}: MemberRouteProps) {
  const { handle } = await params;
  const member = await getMemberByHandle(handle);
  if (!member) notFound();

  const t = await getTranslations("members");
  const format = await getFormatter();
  const query = await searchParams;

  const status: LibraryStatus | null =
    query.status && isLibraryStatus(query.status) ? query.status : null;
  const page = parsePage(query.page);
  const basePath = memberHref(member);

  const [counts, discussion, entries] = await Promise.all([
    member.libraryPublic ? getLibraryCounts(member.id) : Promise.resolve(null),
    getMemberDiscussionStats(member.id),
    member.libraryPublic
      ? listLibrary(member.id, { status, page })
      : Promise.resolve(null),
  ]);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-24 pb-16 sm:px-6 sm:pt-28 lg:px-8">
      <Link
        href="/users"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
      >
        <ChevronLeft className="size-4" aria-hidden />
        {t("title")}
      </Link>

      <header className="border-border mt-4 flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-center">
        {member.image ? (
          <Image
            src={member.image}
            alt=""
            width={80}
            height={80}
            unoptimized
            className="border-border size-20 shrink-0 border object-cover"
          />
        ) : (
          <span className="border-border bg-surface text-muted-foreground flex size-20 shrink-0 items-center justify-center border">
            <UserRound className="size-8" aria-hidden />
          </span>
        )}

        <div className="min-w-0">
          <h1 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
            {member.name}
          </h1>
          {member.handle && (
            <p className="text-muted-foreground text-sm">@{member.handle}</p>
          )}
          <p className="text-muted-foreground mt-1 text-xs">
            {t("joined", {
              date: format.dateTime(new Date(member.createdAt), {
                year: "numeric",
                month: "long",
              }),
            })}
          </p>
        </div>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label={t("statWatching")} value={counts?.watching ?? 0} />
        <Stat label={t("statCompleted")} value={counts?.completed ?? 0} />
        <Stat label={t("statThreads")} value={discussion.threads} />
        <Stat label={t("statPosts")} value={discussion.posts} />
      </section>

      <section className="mt-10">
        <h2 className="text-foreground mb-4 text-lg font-bold tracking-tight sm:text-xl">
          {t("libraryOf")}
        </h2>

        {!member.libraryPublic || !counts || !entries ? (
          <div className="text-muted-foreground border-border flex flex-col items-center gap-2 border py-16 text-center">
            <EyeOff className="text-muted-foreground/70 size-8" aria-hidden />
            <p className="text-sm">{t("privateLibrary")}</p>
          </div>
        ) : (
          <>
            <LibraryTabs active={status} counts={counts} basePath={basePath} />

            {entries.items.length === 0 ? (
              <div className="text-muted-foreground flex flex-col items-center gap-2 py-16 text-center">
                <LibraryIcon
                  className="text-muted-foreground/70 size-8"
                  aria-hidden
                />
                <p className="text-sm">{t("empty")}</p>
              </div>
            ) : (
              <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
                {entries.items.map((entry, index) => (
                  <li key={entry.animeId}>
                    <LibraryCard
                      entry={entry}
                      editable={false}
                      priority={index < 5}
                    />
                  </li>
                ))}
              </ul>
            )}

            <SimplePager
              basePath={basePath}
              page={entries.page}
              hasNextPage={entries.hasNextPage}
              params={{ status }}
            />
          </>
        )}
      </section>
    </main>
  );
}
