import { cn } from "@/lib/utils";

interface LibraryProgressBarProps {
  /** Distinct episodes finished, as counted on the library row. */
  watched: number;
  /** Series length, or null while the catalog has not reported one. */
  total: number | null;
  /** Localized caption rendered above the track; the caller owns the wording. */
  label?: string;
  className?: string;
}

/**
 * The watched-episodes bar (LIB-04) shown on a library card, the anime detail
 * page and a public profile.
 *
 * Flat two-tone track — a muted rail with a Netflix-red fill, sharp corners, no
 * gradient — matching the rest of the design system. When the series length is
 * unknown no track is drawn: a bar that cannot say how far along you are is
 * worse than none, and an empty rail next to "5 episodes watched" would read as
 * 0%. Its space is still reserved, so a shelf of cards keeps every caption,
 * bar and control on one line across the row.
 *
 * The block is a fixed height by construction — a single-line caption plus the
 * rail — which is what lets the cards around it line up without anyone having
 * to hardcode a card height per breakpoint.
 */
export function LibraryProgressBar({
  watched,
  total,
  label,
  className,
}: LibraryProgressBarProps) {
  const known = typeof total === "number" && total > 0;
  const percent = known
    ? Math.min(100, Math.round((watched / total) * 100))
    : 0;

  return (
    <div className={cn("flex w-full flex-col gap-1.5", className)}>
      {/* One line, always: a wrapped caption would push the control below it
          out of line with its neighbours. */}
      <p className="text-muted-foreground h-4 truncate text-xs tracking-wide">
        {label}
      </p>
      {known ? (
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={Math.min(watched, total)}
          aria-label={label}
          className="bg-muted h-1 w-full overflow-hidden"
        >
          <div
            className="bg-primary h-full transition-[width] duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
      ) : (
        // Holds the rail's place so cards with an unknown length still line up.
        <div aria-hidden className="h-1 w-full" />
      )}
    </div>
  );
}
