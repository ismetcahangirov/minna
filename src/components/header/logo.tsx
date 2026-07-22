import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * Site wordmark (HEADER-01): a sharp, high-contrast red wordmark in the header's
 * left slot. No icon/emoji — a bold geometric wordmark per the design system.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Minna — home"
      // Literal uppercase wordmark (not CSS `uppercase`) so the brand renders
      // identically across locales — CSS text-transform applies Turkish casing
      // under `lang="tr"` (i → İ), which we don't want for a brand name.
      className={cn(
        "text-primary text-2xl font-extrabold tracking-tight transition-opacity hover:opacity-90",
        className,
      )}
    >
      MINNA
    </Link>
  );
}
