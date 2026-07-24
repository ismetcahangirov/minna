"use client";

import { useEffect } from "react";

interface HeroInitialScrollProps {
  /** id of the element to bring into view on first load. */
  targetId: string;
  /**
   * Where the target's top should land, as a fraction of the viewport height
   * (0 = very top, 1 = very bottom). Larger values keep more of the hero above.
   */
  viewportRatio?: number;
}

/**
 * On first mount, nudge the very tall detail hero into a slightly scrolled
 * position so the title/actions and the start of the details section land in
 * view instead of sitting below the fold. Renders nothing.
 */
export function HeroInitialScroll({
  targetId,
  viewportRatio = 0.55,
}: HeroInitialScrollProps) {
  useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el) return;
    const top =
      el.getBoundingClientRect().top +
      window.scrollY -
      window.innerHeight * viewportRatio;
    window.scrollTo({ top: Math.max(0, top), behavior: "auto" });
  }, [targetId, viewportRatio]);

  return null;
}
