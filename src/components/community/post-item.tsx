import { UserRound } from "lucide-react";
import Image from "next/image";
import { getFormatter, getTranslations } from "next-intl/server";

import type {
  DiscussionAuthor,
  DiscussionPostItem,
} from "@/lib/discussions/types";
import { Link } from "@/i18n/navigation";
import { memberHref } from "@/lib/members/types";

interface PostItemProps {
  post: DiscussionPostItem;
}

/** Avatar for a post's author, falling back to a neutral mark. */
function Avatar({ author }: { author: DiscussionAuthor | null }) {
  if (author?.image) {
    return (
      <Image
        src={author.image}
        alt=""
        width={32}
        height={32}
        unoptimized
        className="border-border size-8 shrink-0 border object-cover"
      />
    );
  }
  return (
    <span className="border-border bg-surface text-muted-foreground flex size-8 shrink-0 items-center justify-center border">
      <UserRound className="size-4" aria-hidden />
    </span>
  );
}

/**
 * One reply in a thread, or one review under an episode (COMM-02/COMM-07).
 *
 * The author's name links to their public profile, which is how members find
 * each other from a conversation. An author whose account is gone is shown as
 * such rather than removing the post — the conversation stays readable.
 */
export async function PostItem({ post }: PostItemProps) {
  const t = await getTranslations("community");
  const format = await getFormatter();

  return (
    <article className="border-border flex gap-3 border-b py-4 last:border-b-0">
      <Avatar author={post.author} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          {post.author ? (
            <Link
              href={memberHref(post.author)}
              className="text-foreground hover:text-primary text-sm font-semibold transition-colors"
            >
              {post.author.name}
            </Link>
          ) : (
            <span className="text-muted-foreground text-sm font-semibold">
              {t("deletedAuthor")}
            </span>
          )}
          <time
            dateTime={post.createdAt}
            className="text-muted-foreground text-xs"
          >
            {format.dateTime(new Date(post.createdAt), {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </time>
        </div>
        <p className="text-foreground/90 mt-1.5 text-sm whitespace-pre-wrap">
          {post.body}
        </p>
      </div>
    </article>
  );
}
