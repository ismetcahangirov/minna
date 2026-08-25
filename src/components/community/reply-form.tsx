"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useRef } from "react";

import { COMMUNITY_ERROR_KEY } from "@/components/community/error-key";
import { Button } from "@/components/ui/button";
import { createPost, type PostFormState } from "@/lib/discussions/actions";
import { TEXT_LIMITS } from "@/lib/moderation/limits";

interface ReplyFormProps {
  /** Existing thread to post into. Omitted for an episode's first review. */
  threadId?: string | null;
  /**
   * The episode this box belongs to, when there is no thread yet: the action
   * opens the episode's own thread with these details on the first review.
   */
  episodeTarget?: {
    animeId: string;
    animeTitle: string;
    animeImage: string | null;
    episodeNumber: number;
  } | null;
  placeholder: string;
  isAuthenticated: boolean;
  /** Where a signed-out visitor is sent to sign in and come back. */
  loginHref: string;
  /** True when the thread is closed — the box is replaced by a notice. */
  locked?: boolean;
}

const INITIAL: PostFormState = { status: "idle" };

/**
 * The box a member writes a reply or an episode review in (COMM-02/COMM-07).
 *
 * Both are the same write, so this one form serves the thread page and the
 * watch page. Offensive language is refused server-side and comes back as a
 * message under the field — the text is never quietly dropped, and nothing that
 * fails the check is stored.
 *
 * On success the route is refreshed rather than a path being revalidated, so
 * the form does not need to know which page it is embedded in.
 */
export function ReplyForm({
  threadId,
  episodeTarget,
  placeholder,
  isAuthenticated,
  loginHref,
  locked = false,
}: ReplyFormProps) {
  const t = useTranslations("community");
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createPost, INITIAL);
  const form = useRef<HTMLFormElement>(null);

  // Clear the box and pull the new post in once the write lands. Keyed on the
  // state object, which the action returns fresh per submission.
  useEffect(() => {
    if (state.status !== "success") return;
    form.current?.reset();
    router.refresh();
  }, [state, router]);

  if (locked) {
    return (
      <p className="border-border text-muted-foreground border p-4 text-sm">
        {t("locked")}
      </p>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="border-border flex flex-col items-start gap-3 border p-4">
        <p className="text-muted-foreground text-sm">{t("signInToPost")}</p>
        <Button nativeButton={false} render={<Link href={loginHref} />}>
          {t("signIn")}
        </Button>
      </div>
    );
  }

  const error = state.error ? t(COMMUNITY_ERROR_KEY[state.error]) : null;

  return (
    <form ref={form} action={formAction} className="flex flex-col gap-3">
      <textarea
        name="body"
        rows={4}
        required
        maxLength={TEXT_LIMITS.post.max}
        placeholder={placeholder}
        aria-label={placeholder}
        className="border-border bg-surface text-foreground placeholder:text-muted-foreground/70 focus-visible:border-primary/60 w-full resize-y border px-3 py-2 text-sm transition-colors outline-none"
      />

      {threadId && <input type="hidden" name="threadId" value={threadId} />}
      {!threadId && episodeTarget && (
        <>
          <input type="hidden" name="animeId" value={episodeTarget.animeId} />
          <input
            type="hidden"
            name="animeTitle"
            value={episodeTarget.animeTitle}
          />
          <input
            type="hidden"
            name="animeImage"
            value={episodeTarget.animeImage ?? ""}
          />
          <input
            type="hidden"
            name="episodeNumber"
            value={episodeTarget.episodeNumber}
          />
        </>
      )}

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? t("posting") : t("post")}
        </Button>
      </div>
    </form>
  );
}
