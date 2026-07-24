import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * Site brand (HEADER-01): the Minna app icon followed by a sharp, high-contrast
 * red wordmark in the header's left slot. The icon is the brand's own squircle
 * mark (its rounded shape is intrinsic to the logo, not a UI surface), sitting
 * to the left of the wordmark.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Minna — home"
      className={cn(
        "group inline-flex items-center gap-2 transition-opacity hover:opacity-90",
        className,
      )}
    >
      <Image
        src="/minna.svg"
        alt=""
        width={32}
        height={32}
        priority
        unoptimized
        className="size-7 shrink-0 sm:size-8"
      />
      {/* Literal uppercase wordmark (not CSS `uppercase`) so the brand renders
          identically across locales — CSS text-transform applies Turkish casing
          under `lang="tr"` (i → İ), which we don't want for a brand name. */}
      <span className="text-primary text-2xl font-extrabold tracking-tight">
        MINNA
      </span>
    </Link>
  );
}
