import { Film } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { LibraryProgressBar } from "@/components/library/progress-bar";
import { LibraryStatusMenu } from "@/components/library/status-menu";
import { animeHref } from "@/lib/anime/href";
import type { LibraryEntry } from "@/lib/library/types";

interface LibraryCardProps {
  entry: LibraryEntry;
  /**
   * Whether the viewer may re-file this entry. False on someone else's public
   * profile, where the shelf is shown as a plain label instead of a control.
   */
  editable?: boolean;
  /** Set on the first cards so above-the-fold art is not lazy-loaded. */
  priority?: boolean;
}

/** Message key under the `library` namespace for each shelf. */
const STATUS_KEY = {
  watching: "statusWatching",
  completed: "statusCompleted",
  on_hold: "statusOnHold",
  dropped: "statusDropped",
  planned: "statusPlanned",
} as const;

/**
 * One anime on a library shelf (LIB-03): its poster, its title, how far through
 * it the member is, and — on their own library — the control to re-file it.
 *
 * Every value shown is read off the library row itself, so a full shelf renders
 * from a single query with no catalog call per card.
 */
export async function LibraryCard({
  entry,
  editable = true,
  priority,
}: LibraryCardProps) {
  const t = await getTranslations("library");
  const href = animeHref(entry.animeId, entry.title);

  const progressLabel = entry.totalEpisodes
    ? t("progress", {
        watched: entry.episodesWatched,
        total: entry.totalEpisodes,
      })
    : t("progressUnknown", { watched: entry.episodesWatched });

  return (
    <div className="flex w-full flex-col">
      <Link
        href={href}
        className="group focus-visible:ring-ring block outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
      >
        <div className="border-border bg-surface group-hover:border-primary/60 relative aspect-[2/3] w-full overflow-hidden border transition-colors">
          {entry.image ? (
            <Image
              src={entry.image}
              alt={entry.title}
              fill
              priority={priority}
              sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 200px"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="text-muted-foreground flex h-full w-full items-center justify-center">
              <Film className="size-8" aria-hidden />
            </div>
          )}
        </div>
        <h3 className="text-foreground group-hover:text-primary mt-2 line-clamp-2 text-sm font-semibold transition-colors">
          {entry.title}
        </h3>
      </Link>

      <LibraryProgressBar
        watched={entry.episodesWatched}
        total={entry.totalEpisodes}
        label={progressLabel}
        className="mt-2"
      />

      {editable ? (
        <LibraryStatusMenu
          animeId={entry.animeId}
          title={entry.title}
          image={entry.image}
          totalEpisodes={entry.totalEpisodes}
          status={entry.status}
          className="mt-3 w-full"
        />
      ) : (
        <p className="border-border text-muted-foreground mt-3 border px-2 py-1.5 text-center text-xs tracking-wide uppercase">
          {t(STATUS_KEY[entry.status])}
        </p>
      )}
    </div>
  );
}
