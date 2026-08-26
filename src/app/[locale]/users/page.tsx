import type { Metadata } from "next";
import { Search, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { MemberCard } from "@/components/members/member-card";
import { Button } from "@/components/ui/button";
import { SimplePager } from "@/components/ui/simple-pager";
import { Link } from "@/i18n/navigation";
import { listMembers } from "@/lib/members/queries";
import { parseMemberQuery } from "@/lib/members/types";

interface MembersRouteProps {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("members");
  return {
    title: `${t("title")} — Minna`,
    description: t("subtitle"),
    // A people directory: findable inside the site, not something to index.
    robots: { index: false, follow: true },
    alternates: { canonical: "/users" },
  };
}

/** Reads `?page=`, falling back to the first page for anything unparseable. */
function parsePage(raw: string | undefined): number {
  if (!raw || !/^\d+$/.test(raw)) return 1;
  return Math.max(1, Number.parseInt(raw, 10));
}

/**
 * The member directory (MEM-02) — how members find each other.
 *
 * The search box is a plain GET form, so the query lives in the URL, works with
 * no JavaScript at all, and every result page is linkable. One indexed query
 * per page; no per-member statistics are gathered here.
 */
export default async function MembersPage({ searchParams }: MembersRouteProps) {
  const t = await getTranslations("members");
  const params = await searchParams;
  const query = parseMemberQuery(params.q);
  const page = parsePage(params.page);

  const members = await listMembers({ query, page });

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 pt-24 pb-16 sm:px-6 sm:pt-28 lg:px-8">
      <header className="mb-6 flex flex-col gap-2">
        <h1 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          {t("heading")}
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm sm:text-base">
          {t("subtitle")}
        </p>
      </header>

      <form
        action="/users"
        method="get"
        className="mb-8 flex flex-col gap-2 sm:flex-row"
      >
        <div className="relative flex-1">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden
          />
          <input
            type="search"
            name="q"
            defaultValue={query ?? ""}
            placeholder={t("searchPlaceholder")}
            aria-label={t("search")}
            className="border-border bg-surface text-foreground placeholder:text-muted-foreground/70 focus-visible:border-primary/60 w-full border py-2 pr-3 pl-9 text-sm transition-colors outline-none"
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" size="lg">
            {t("search")}
          </Button>
          {query && (
            <Button
              variant="outline"
              size="lg"
              nativeButton={false}
              render={<Link href="/users" />}
            >
              {t("clear")}
            </Button>
          )}
        </div>
      </form>

      {query && (
        <p className="text-muted-foreground mb-4 text-sm">
          {t("resultsFor", { query })}
        </p>
      )}

      {members.items.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center gap-3 py-20 text-center">
          <Users className="text-muted-foreground/70 size-10" aria-hidden />
          <p className="text-foreground text-lg font-medium">{t("empty")}</p>
          <p className="max-w-sm text-sm">{t("emptyHint")}</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {members.items.map((member) => (
            <li key={member.id}>
              <MemberCard member={member} />
            </li>
          ))}
        </ul>
      )}

      <SimplePager
        basePath="/users"
        page={members.page}
        hasNextPage={members.hasNextPage}
        params={{ q: query }}
      />
    </main>
  );
}
