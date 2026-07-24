"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/** Past this scroll depth the header gains its solid background + hairline. */
const SCROLL_THRESHOLD = 8;
/** Minimum per-event delta (px) before a scroll counts as a direction change. */
const DIRECTION_DELTA = 4;
/** Grace window (ms) after load/navigation during which the auto-hide is
 *  suppressed, so the page's own initial auto-scroll never hides the header. */
const SETTLE_MS = 900;

/**
 * Fixed, top-0 header container (HEADER-01). Transparent while the page is at
 * the top so content (e.g. the home hero) shows through; once scrolled it
 * switches to a solid background with a bottom hairline. Solid fill only —
 * no backdrop-blur/glassmorphism and no gradient (design system).
 *
 * Auto-hide: scrolling down slides the bar up out of view, scrolling up brings
 * it back, and it is always shown at the very top. The slide is animated via a
 * `translate` transition. The auto-hide arms only after a short settle window
 * (re-armed on navigation) so the page's initial auto-scroll can't hide it.
 */
export function HeaderShell({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const pathname = usePathname();

  useEffect(() => {
    lastY.current = window.scrollY;
    let armed = false;
    const arm = window.setTimeout(() => {
      armed = true;
    }, SETTLE_MS);

    const onScroll = () => {
      const y = Math.max(0, window.scrollY);
      const prev = lastY.current;
      lastY.current = y;

      setScrolled(y > SCROLL_THRESHOLD);

      // Always reveal near the top.
      if (y <= SCROLL_THRESHOLD) {
        setHidden(false);
        return;
      }
      // Ignore scroll during the settle window (covers the initial auto-scroll).
      if (!armed) return;
      // Hide on the way down, show on the way up (past a jitter threshold).
      if (y - prev > DIRECTION_DELTA) setHidden(true);
      else if (prev - y > DIRECTION_DELTA) setHidden(false);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.clearTimeout(arm);
      window.removeEventListener("scroll", onScroll);
    };
  }, [pathname]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[translate,background-color,border-color] duration-300 [will-change:translate]",
        hidden ? "-translate-y-full" : "translate-y-0",
        scrolled
          ? "bg-background border-border border-b"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-4 px-4 sm:px-6 lg:px-8">
        {children}
      </div>
    </header>
  );
}
