import { Pointer } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * A looping "tap this" hint (DETAIL-02): a finger pressing down with two ripple
 * arcs leaving the fingertip.
 *
 * Shown beside the episodes button of a standalone title, which has no season
 * switcher next to it and so gives the eye nothing to follow to the next step.
 *
 * Purely decorative: `aria-hidden` and `pointer-events-none`, so it neither
 * reaches the accessibility tree nor swallows a click meant for the button it
 * is drawn on top of. Colour is inherited, so the caller can match whatever
 * surface it sits on. The motion is CSS only — no library, no client JavaScript, and it
 * stops entirely under `prefers-reduced-motion` (see `globals.css`).
 *
 * Geometry: lucide's `Pointer` places the index fingertip a third of the way
 * across its 24×24 box, at roughly (8, 2.5). The ripple layers are sized and
 * offset so their centres land on that point, which is what lets a plain
 * `scale()` grow each arc around the fingertip.
 */
export function TapHint({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute isolate select-none",
        // Legible over a filled button: the line art keeps its own edge
        // against the label underneath it.
        "[filter:drop-shadow(0_1px_2px_rgba(0,0,0,0.85))]",
        className,
      )}
    >
      {/* 32px hand: fingertip lands at (10.7, 3.3) inside this box. */}
      <Pointer className="tap-hint-hand size-8" />

      {/* Both ripple layers are 24px boxes centred on that fingertip:
          left = 10.7 - 12, top = 3.3 - 12. */}
      <span className="absolute top-[-8.7px] left-[-1.3px] block size-6">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          className="tap-hint-wave absolute inset-0 size-full"
        >
          <path d="M8.14 7.4 A6 6 0 0 0 6.09 13.04" />
          <path d="M15.86 7.4 A6 6 0 0 1 17.91 13.04" />
        </svg>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          className="tap-hint-wave tap-hint-wave-outer absolute inset-0 size-full"
        >
          <path d="M6.21 5.11 A9 9 0 0 0 3.13 13.57" />
          <path d="M17.79 5.11 A9 9 0 0 1 20.87 13.57" />
        </svg>
      </span>
    </span>
  );
}
