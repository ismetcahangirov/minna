import { getTranslations } from "next-intl/server";

import {
  LIBRARY_STATUSES,
  type LibraryCounts,
  type LibraryStatus,
} from "@/lib/library/types";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

interface LibraryTabsProps {
  /** Shelf currently shown, or null for the combined view. */
  active: LibraryStatus | null;
  counts: LibraryCounts;
  /** Route the tabs link to — the member's own library or a public profile. */
  basePath: string;
}

/** Message key under the `library` namespace for each shelf. */
const STATUS_KEY: Record<LibraryStatus, string> = {
  watching: "statusWatching",
  completed: "statusCompleted",
  on_hold: "statusOnHold",
  dropped: "statusDropped",
  planned: "statusPlanned",
};

/**
 * Shelf switcher for a library (LIB-03). Every tab is a real link carrying
 * `?status=`, so a shelf is bookmarkable and survives a reload with no client
 * state, and the counts come from the one grouped query the page already runs.
 *
 * Shelves nobody has filed anything on are still shown, so the vocabulary of
 * the feature is visible before it is used.
 */
export async function LibraryTabs({
  active,
  counts,
  basePath,
}: LibraryTabsProps) {
  const t = await getTranslations("library");

  const tabs: Array<{
    status: LibraryStatus | null;
    label: string;
    total: number;
  }> = [
    { status: null, label: t("statusAll"), total: counts.total },
    ...LIBRARY_STATUSES.map((status) => ({
      status,
      label: t(STATUS_KEY[status]),
      total: counts[status],
    })),
  ];

  return (
    <nav className="border-border flex flex-wrap items-center gap-x-1 gap-y-2 border-b pb-3">
      {tabs.map(({ status, label, total }) => {
        const href = status ? `${basePath}?status=${status}` : basePath;
        const isActive = status === active;
        return (
          <Link
            key={status ?? "all"}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "text-primary border-primary border-b-2"
                : "text-muted-foreground hover:text-foreground border-b-2 border-transparent",
            )}
          >
            <span>{label}</span>
            <span className="text-muted-foreground text-xs">{total}</span>
          </Link>
        );
      })}
    </nav>
  );
}
