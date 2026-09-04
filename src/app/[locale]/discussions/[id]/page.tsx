import type { Metadata } from "next";
import { ChevronLeft, Film, MessageSquare } from "lucide-react";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";

import { PostItem } from "@/components/community/post-item";
import { ReplyForm } from "@/components/community/reply-form";
import { SimplePager } from "@/components/ui/simple-pager";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/route-locale";
import {
  canonicalAnimeHref,
  canonicalWatchHref,
} from "@/lib/anime/canonical-slug";
import { getCurrentUser } from "@/lib/auth/session";
import { getThread, listThreadPosts } from "@/lib/discussions/queries";
import { memberHref } from "@/lib/members/types";
import {
  localeAlternates,
  openGraphLocaleSet,
} from "@/lib/seo/locale-alternates";

interface ThreadRouteProps {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ page?: string }>;
}

/** Reads `?page=`, falling back to the first page for anything unparseable. */
function parsePage(raw: string | undefined): number {
  if (!raw || !/^\d+$/.test(raw)) return 1;
  return Math.max(1, Number.parseInt(raw, 10));
}

export async function generateMetadata({
  params,
}: ThreadRouteProps): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const { id } = await params;
  const thread = await getThread(id);

  if (!thread) return { title: "Discussion not found — Minna" };

  const description = thread.body
    ? thread.body.slice(0, 200)
    : `${thread.animeTitle} — Minna`;

  return {
    title: `${thread.title} — Minna`,
    description,
    alternates: localeAlternates(`/discussions/${thread.id}`, locale),
    openGraph: {
      ...openGraphLocaleSet(locale),
      title: thread.title,
      description,
      type: "article",
      images: thread.animeImage
        ? [{ url: thread.animeImage, alt: thread.animeTitle }]
        : [],
    },
  };
}

/**
 * One discussion (COMM-04): its opening post, its replies oldest-first, and the
 * box to add one.
 *
 * Two indexed queries — the thread and one page of its posts — and no aggregate
 * anywhere: the pager learns whether another page exists by reading a single
 * row past the end.
 */
export default async function ThreadPage({
  params,
  searchParams,
}: ThreadRouteProps) {
  const { id } = await params;
  const { page: rawPage } = await searchParams;
  const page = parsePage(rawPage);

  const thread = await getThread(id);
  if (!thread) notFound();

  const t = await getTranslations("community");
  const format = await getFormatter();
  const [posts, user] = await Promise.all([
    listThreadPosts(thread.id, page),
    getCurrentUser(),
  ]);

  const scopeLabel =
    thread.scope === "episode" && thread.episodeNumber !== null
      ? t("episodeLabel", { number: thread.episodeNumber })
      : thread.scope === "season"
        ? (thread.seasonLabel ?? t("scopeSeason"))
        : t("scopeAnime");

  // An episode thread points at the player; anything else at the anime page.
  // Both go through the registry rather than this thread's stored title: the
  // segment the proxy redirects to is whatever the registry holds, so deriving
  // one here linked at a URL that answered 308.
  const targetHref =
    thread.scope === "episode" && thread.episodeNumber !== null
      ? await canonicalWatchHref(
          thread.animeId,
          thread.episodeNumber,
          thread.animeTitle,
        )
      : await canonicalAnimeHref(
          thread.scope === "season" && thread.seasonId
            ? thread.seasonId
            : thread.animeId,
          thread.animeTitle,
        );

  const loginHref = `/login?callbackUrl=${encodeURIComponent(`/discussions/${thread.id}`)}`;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-24 pb-16 sm:px-6 sm:pt-28 lg:px-8">
      <Link
        href="/discussions"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
      >
        <ChevronLeft className="size-4" aria-hidden />
        {t("backToList")}
      </Link>

      <article className="border-border mt-4 border p-4 sm:p-6">
        <div className="flex gap-4">
          <Link
            href={targetHref}
            className="border-border bg-surface relative hidden h-28 w-20 shrink-0 overflow-hidden border sm:block"
          >
            {thread.animeImage ? (
              <Image
                src={thread.animeImage}
                alt={thread.animeTitle}
                fill
                sizes="80px"
                className="object-cover"
              />
            ) : (
              <div className="text-muted-foreground flex h-full w-full items-center justify-center">
                <Film className="size-6" aria-hidden />
              </div>
            )}
          </Link>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="border-border text-muted-foreground border px-2 py-0.5 text-[11px] tracking-wide uppercase">
                {scopeLabel}
              </span>
              <Link
                href={targetHref}
                className="text-muted-foreground hover:text-primary truncate text-xs transition-colors"
              >
                {thread.animeTitle}
              </Link>
            </div>

            <h1 className="text-foreground mt-2 text-xl font-extrabold tracking-tight sm:text-2xl">
              {thread.title}
            </h1>

            <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              {thread.auto ? (
                <span>{t("openedBySite")}</span>
              ) : thread.author ? (
                <Link
                  href={memberHref(thread.author)}
                  className="hover:text-primary transition-colors"
                >
                  {t("startedBy", { name: thread.author.name })}
                </Link>
              ) : (
                <span>{t("startedBy", { name: t("deletedAuthor") })}</span>
              )}
              <span className="inline-flex items-center gap-1">
                <MessageSquare className="size-3.5" aria-hidden />
                {t("replies", { count: thread.replyCount })}
              </span>
              <time dateTime={thread.createdAt}>
                {format.dateTime(new Date(thread.createdAt), {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </time>
            </div>
          </div>
        </div>

        {thread.body && (
          <p className="text-foreground/90 mt-5 text-sm whitespace-pre-wrap sm:text-base">
            {thread.body}
          </p>
        )}
      </article>

      <section className="mt-8">
        {posts.items.length === 0 ? (
          <div className="text-muted-foreground border-border flex flex-col items-center gap-2 border py-12 text-center">
            <p className="text-foreground font-medium">{t("noReplies")}</p>
            <p className="text-sm">{t("noRepliesHint")}</p>
          </div>
        ) : (
          <div className="border-border border-t">
            {posts.items.map((post) => (
              <PostItem key={post.id} post={post} />
            ))}
          </div>
        )}

        <SimplePager
          basePath={`/discussions/${thread.id}`}
          page={posts.page}
          hasNextPage={posts.hasNextPage}
        />
      </section>

      <section className="mt-8">
        <h2 className="text-foreground mb-3 text-lg font-bold tracking-tight">
          {t("reply")}
        </h2>
        <ReplyForm
          threadId={thread.id}
          placeholder={t("replyPlaceholder")}
          isAuthenticated={Boolean(user?.id)}
          loginHref={loginHref}
          locked={thread.locked}
        />
      </section>
    </main>
  );
}
