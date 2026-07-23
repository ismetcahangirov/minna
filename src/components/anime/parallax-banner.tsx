"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

/**
 * Parallax backdrop for the anime detail hero (DETAIL-01). The banner drifts
 * downward at a fraction of the scroll speed for depth. Dependency-free: a
 * passive scroll listener writes a `transform` straight to the DOM inside a
 * `requestAnimationFrame`, so React never re-renders on scroll.
 *
 * Accessibility/perf: honours `prefers-reduced-motion` (no movement), is
 * `pointer-events-none`, and keeps `next/image` `priority` so it stays the LCP
 * element. The scaled layer is clipped by the hero's own `overflow-hidden`, and
 * the drift is clamped to the scale overhang so no empty edge is ever revealed.
 */
export function ParallaxBanner({ src }: { src: string }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = frameRef.current;
    const layer = layerRef.current;
    if (!frame || !layer) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const top = frame.getBoundingClientRect().top;
      const scrolledPast = Math.max(-top, 0);
      // Drift at ~30% of scroll, clamped to the scale-120 overhang (~10% of the
      // hero height) so the top edge of the image never lifts into view.
      const maxDrift = frame.offsetHeight * 0.1;
      const drift = Math.min(scrolledPast * 0.3, maxDrift);
      layer.style.transform = `translate3d(0, ${drift}px, 0) scale(1.2)`;
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={frameRef}
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
    >
      <div
        ref={layerRef}
        className="absolute inset-0 scale-[1.2] will-change-transform"
      >
        <Image
          src={src}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-top opacity-60"
        />
      </div>
    </div>
  );
}
