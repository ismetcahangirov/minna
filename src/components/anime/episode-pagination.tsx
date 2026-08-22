import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { animeEpisodesPageHref } from "@/lib/anime/href";
import { cn } from "@/lib/utils";

interface EpisodePaginationProps {
  animeId: string;
  animeTitle: string;
  /** 1-based page currently rendered. */
  page: number;
  totalPages: number;
  /** Whether the list is sorted newest-first (kept across page changes). */
  descending: boolean;
}

/** How many numbered links surround the current page before ellipsis kicks in. */
const WINDOW = 1;

/**
 * The page numbers to render: always the first and last page, plus a window
 * around the current one. `null` marks a gap (rendered as an ellipsis).
 */
function pageItems(page: number, totalPages: number): Array<number | null> {
  const wanted = new Set<number>([1, totalPages]);
  for (let n = page - WINDOW; n <= page + WINDOW; n++) {
    if (n >= 1 && n <= totalPages) wanted.add(n);
  }

  const numbers = [...wanted].sort((a, b) => a - b);
  const items: Array<number | null> = [];
  let previous = 0;
  for (const number of numbers) {
    if (previous && number - previous > 1) items.push(null);
    items.push(number);
    previous = number;
  }
  return items;
}

const LINK_BASE =
  "border-border bg-surface text-foreground hover:border-primary/60 hover:text-primary flex h-9 min-w-9 items-center justify-center border px-3 text-sm font-semibold transition-colors";

/**
 * Numbered pagination for the episodes list. Every page is a real `<a href>`
 * carrying `?page=` (and `?order=desc` when the list is reversed), so pages are
 * crawlable, linkable and survive a reload — no client state involved.
 */
export async function EpisodePagination({
  animeId,
  animeTitle,
  page,
  totalPages,
  descending,
}: EpisodePaginationProps) {
  if (totalPages <= 1) return null;

  const t = await getTranslations("detail.pagination");
  const href = (target: number) =>
    animeEpisodesPageHref(animeId, animeTitle, { page: target, descending });

  return (
    <nav
      aria-label={t("label")}
      className="mt-6 flex flex-wrap items-center justify-center gap-2"
    >
      {page > 1 ? (
        <Link href={href(page - 1)} rel="prev" className={LINK_BASE}>
          <ChevronLeft className="size-4" aria-hidden />
          <span className="hidden sm:inline">{t("previous")}</span>
          <span className="sr-only sm:hidden">{t("previous")}</span>
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className={cn(LINK_BASE, "pointer-events-none opacity-40")}
        >
          <ChevronLeft className="size-4" aria-hidden />
          <span className="hidden sm:inline">{t("previous")}</span>
        </span>
      )}

      {pageItems(page, totalPages).map((item, index) =>
        item === null ? (
          <span
            key={`gap-${index}`}
            aria-hidden
            className="text-muted-foreground px-1 text-sm"
          >
            &hellip;
          </span>
        ) : item === page ? (
          <span
            key={item}
            aria-current="page"
            className="border-primary bg-primary text-primary-foreground flex h-9 min-w-9 items-center justify-center border px-3 text-sm font-bold"
          >
            {item}
          </span>
        ) : (
          <Link
            key={item}
            href={href(item)}
            aria-label={t("page", { number: item })}
            className={LINK_BASE}
          >
            {item}
          </Link>
        ),
      )}

      {page < totalPages ? (
        <Link href={href(page + 1)} rel="next" className={LINK_BASE}>
          <span className="hidden sm:inline">{t("next")}</span>
          <span className="sr-only sm:hidden">{t("next")}</span>
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className={cn(LINK_BASE, "pointer-events-none opacity-40")}
        >
          <span className="hidden sm:inline">{t("next")}</span>
          <ChevronRight className="size-4" aria-hidden />
        </span>
      )}
    </nav>
  );
}
