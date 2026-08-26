"use client";

import { Menu } from "@base-ui/react/menu";
import { Check, ChevronDown, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Link, useRouter } from "@/i18n/navigation";
import { removeFromLibrary, setLibraryStatus } from "@/lib/library/actions";
import { LIBRARY_STATUSES, type LibraryStatus } from "@/lib/library/types";
import { cn } from "@/lib/utils";

interface LibraryStatusMenuProps {
  animeId: string;
  title: string;
  image?: string | null;
  totalEpisodes?: number | null;
  /** Current shelf, or null when the anime is not in the library yet. */
  status: LibraryStatus | null;
  /** When signed out, where the control sends the visitor instead of acting. */
  loginHref?: string | null;
  className?: string;
}

/** Message key under the `library` namespace for each shelf. */
const STATUS_KEY: Record<LibraryStatus, string> = {
  watching: "statusWatching",
  completed: "statusCompleted",
  on_hold: "statusOnHold",
  dropped: "statusDropped",
  planned: "statusPlanned",
};

const itemClass =
  "text-muted-foreground data-highlighted:bg-muted data-highlighted:text-foreground flex cursor-pointer items-center justify-between gap-6 px-3 py-2 text-sm transition-colors outline-none select-none";

/**
 * The control a member files an anime with (LIB-05): watching, finished, on
 * hold, dropped or planned — or off the shelves entirely.
 *
 * Choosing a status by hand permanently pins it, so watching another episode
 * afterwards cannot quietly reclassify a series the member has already called
 * finished. The choice shows immediately and is rolled back if the write fails,
 * and the route is refreshed on success so the shelf counts follow.
 */
export function LibraryStatusMenu({
  animeId,
  title,
  image,
  totalEpisodes,
  status,
  loginHref,
  className,
}: LibraryStatusMenuProps) {
  const t = useTranslations("library");
  const router = useRouter();
  const [current, setCurrent] = useState<LibraryStatus | null>(status);
  const [pending, startTransition] = useTransition();

  const triggerClass = cn(
    "border-border bg-surface text-foreground hover:border-primary/60 hover:text-primary inline-flex h-9 items-center justify-between gap-2 border px-3 text-sm font-medium transition-colors outline-none disabled:opacity-50",
    className,
  );

  if (loginHref) {
    return (
      <Link href={loginHref} className={triggerClass}>
        <Plus className="size-4" aria-hidden />
        <span>{t("addToLibrary")}</span>
      </Link>
    );
  }

  function choose(next: LibraryStatus | null) {
    if (next === current) return;
    const previous = current;
    setCurrent(next);

    startTransition(async () => {
      const result =
        next === null
          ? await removeFromLibrary(animeId)
          : await setLibraryStatus({
              animeId,
              status: next,
              title,
              image,
              totalEpisodes,
            });

      if (!result.ok) setCurrent(previous);
      else router.refresh();
    });
  }

  return (
    <Menu.Root>
      <Menu.Trigger disabled={pending} className={triggerClass}>
        <span className="truncate">
          {pending
            ? t("saving")
            : current
              ? t(STATUS_KEY[current])
              : t("addToLibrary")}
        </span>
        <ChevronDown className="size-4 shrink-0" aria-hidden />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner
          className="z-50 outline-none"
          sideOffset={6}
          align="start"
        >
          <Menu.Popup
            className={cn(
              "bg-popover text-popover-foreground border-border min-w-52 border p-1 shadow-lg outline-none",
              "origin-[var(--transform-origin)] transition-[transform,opacity] duration-150",
              "data-starting-style:scale-95 data-starting-style:opacity-0",
              "data-ending-style:scale-95 data-ending-style:opacity-0",
            )}
          >
            {LIBRARY_STATUSES.map((value) => (
              <Menu.Item
                key={value}
                className={itemClass}
                onClick={() => choose(value)}
              >
                {t(STATUS_KEY[value])}
                {value === current && (
                  <Check className="text-primary size-4" aria-hidden />
                )}
              </Menu.Item>
            ))}
            {current && (
              <Menu.Item
                className={cn(itemClass, "text-destructive")}
                onClick={() => choose(null)}
              >
                {t("remove")}
                <Trash2 className="size-4" aria-hidden />
              </Menu.Item>
            )}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
