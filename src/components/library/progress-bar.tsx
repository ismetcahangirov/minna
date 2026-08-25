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
 * unknown the track is dropped entirely rather than guessed at: a bar that
 * cannot say how far along you are is worse than none, so only the caption is
 * left standing.
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
      {label && (
        <p className="text-muted-foreground text-xs tracking-wide">{label}</p>
      )}
      {known && (
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
      )}
    </div>
  );
}
