import { MessagesSquare } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { PostItem } from "@/components/community/post-item";
import { ReplyForm } from "@/components/community/reply-form";
import { getEpisodeThread, listThreadPosts } from "@/lib/discussions/queries";
import { EPISODE_REVIEW_PREVIEW } from "@/lib/discussions/types";

interface EpisodeReviewsProps {
  animeId: string;
  animeTitle: string;
  animeImage: string | null;
  episodeNumber: number;
  isAuthenticated: boolean;
  /** Where a signed-out viewer is sent to sign in and come back. */
  loginHref: string;
}

/**
 * Reviews under an episode on the watch page (COMM-07).
 *
 * These are ordinary posts in the episode's own thread, so they go through the
 * same profanity gate, the same throttle and the same moderation path as the
 * rest of the community — there is no second comment system to keep in step.
 * The thread is opened by the site itself on the first review, so an episode
 * nobody has written about costs one index probe and no rows.
 *
 * Rendered inside a `Suspense` boundary on the watch route, so these two
 * queries never hold up the player.
 */
export async function EpisodeReviews({
  animeId,
  animeTitle,
  animeImage,
  episodeNumber,
  isAuthenticated,
  loginHref,
}: EpisodeReviewsProps) {
  const t = await getTranslations("community");
  const thread = await getEpisodeThread(animeId, episodeNumber);
  const posts = thread
    ? await listThreadPosts(thread.id, 1, EPISODE_REVIEW_PREVIEW)
    : null;

  return (
    <section className="mt-10">
      <header className="mb-4 flex flex-col gap-1">
        <h2 className="text-foreground text-lg font-bold tracking-tight sm:text-xl">
          {t("reviewsTitle")}
        </h2>
        <p className="text-muted-foreground text-sm">{t("reviewsSubtitle")}</p>
      </header>

      {posts && posts.items.length > 0 ? (
        <div className="border-border border-t">
          {posts.items.map((post) => (
            <PostItem key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <div className="text-muted-foreground border-border flex flex-col items-center gap-2 border py-10 text-center">
          <MessagesSquare
            className="text-muted-foreground/70 size-8"
            aria-hidden
          />
          <p className="text-foreground font-medium">{t("noReviews")}</p>
          <p className="text-sm">{t("noReviewsHint")}</p>
        </div>
      )}

      {thread && thread.replyCount > EPISODE_REVIEW_PREVIEW && (
        <Link
          href={`/discussions/${thread.id}`}
          className="text-primary mt-4 inline-block text-sm font-semibold hover:underline"
        >
          {t("seeAllReviews")}
        </Link>
      )}

      <div className="mt-6">
        <ReplyForm
          threadId={thread?.id ?? null}
          episodeTarget={
            thread ? null : { animeId, animeTitle, animeImage, episodeNumber }
          }
          placeholder={t("reviewPlaceholder")}
          isAuthenticated={isAuthenticated}
          loginHref={loginHref}
          locked={thread?.locked ?? false}
        />
      </div>
    </section>
  );
}
