"use client";

import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";

interface EpisodeSearchFieldProps {
  value: string;
  onValueChange: (value: string) => void;
  /** Form field name — set when the field posts as part of a GET form. */
  name?: string;
}

/**
 * The episode filter input itself: a flat, sharp-cornered search box with a
 * clear button. Presentational on purpose — the episodes route drives it from
 * the URL while the watch route filters in place, and both render this.
 */
export function EpisodeSearchField({
  value,
  onValueChange,
  name,
}: EpisodeSearchFieldProps) {
  const t = useTranslations("detail.search");

  return (
    <div className="relative w-full sm:max-w-sm">
      <Search
        className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
        aria-hidden
      />
      <input
        type="search"
        name={name}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={t("placeholder")}
        aria-label={t("label")}
        className="border-border bg-surface text-foreground placeholder:text-muted-foreground focus:border-primary h-10 w-full border pr-10 pl-9 text-sm transition-colors outline-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => onValueChange("")}
          aria-label={t("clear")}
          className="text-muted-foreground hover:text-primary focus-visible:ring-ring absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center outline-none focus-visible:ring-2"
        >
          <X className="size-4" aria-hidden />
        </button>
      )}
    </div>
  );
}
