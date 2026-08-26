import { Film, Lock, MessageSquare } from "lucide-react";
import Image from "next/image";
import { getFormatter, getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import type { ThreadSummary } from "@/lib/discussions/types";

interface ThreadCardProps {
  thread: ThreadSummary;
}

/**
 * One thread in the community listing (COMM-03).
 *
 * Everything on the card — the anime's title and art included — comes off the
 * thread row itself, so a page of twenty costs one query and no catalog call.
 * The reply count is the thread's own counter rather than an aggregate.
 */
export async function ThreadCard({ thread }: ThreadCardProps) {
  const t = await getTranslations("community");
  const format = await getFormatter();

  const scopeLabel =
    thread.scope === "episode" && thread.episodeNumber !== null
      ? t("episodeLabel", { number: thread.episodeNumber })
      : thread.scope === "season"
        ? (thread.seasonLabel ?? t("scopeSeason"))
        : t("scopeAnime");

  const byline = thread.auto
    ? t("openedBySite")
    : t("startedBy", { name: thread.author?.name ?? t("deletedAuthor") });

  return (
    <Link
      href={`/discussions/${thread.id}`}
      className="group border-border hover:border-primary/60 focus-visible:border-primary flex gap-4 border p-4 transition-colors outline-none"
    >
      <div className="border-border bg-surface relative hidden h-24 w-16 shrink-0 overflow-hidden border sm:block">
        {thread.animeImage ? (
          <Image
            src={thread.animeImage}
            alt=""
            fill
            sizes="64px"
            className="object-cover"
          />
        ) : (
          <div className="text-muted-foreground flex h-full w-full items-center justify-center">
            <Film className="size-5" aria-hidden />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="border-border text-muted-foreground border px-2 py-0.5 text-[11px] tracking-wide uppercase">
            {scopeLabel}
          </span>
          <span className="text-muted-foreground truncate text-xs">
            {thread.animeTitle}
          </span>
          {thread.locked && (
            <Lock className="text-muted-foreground size-3.5" aria-hidden />
          )}
        </div>

        <h3 className="text-foreground group-hover:text-primary line-clamp-2 text-base font-semibold transition-colors">
          {thread.title}
        </h3>

        <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span>{byline}</span>
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="size-3.5" aria-hidden />
            {t("replies", { count: thread.replyCount })}
          </span>
          <time dateTime={thread.lastPostAt}>
            {format.dateTime(new Date(thread.lastPostAt), {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </time>
        </div>
      </div>
    </Link>
  );
}
