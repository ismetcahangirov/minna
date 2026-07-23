"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  type PointerEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

import { cn } from "@/lib/utils";

interface AnimeCarouselProps {
  children: ReactNode;
  /** Localized aria-labels for the edge controls. */
  prevLabel: string;
  nextLabel: string;
}

const railClass =
  "flex snap-x snap-proximity gap-4 overflow-x-auto scroll-smooth scroll-pl-4 px-4 py-4 sm:gap-5 sm:scroll-pl-6 sm:px-6 lg:scroll-pl-8 lg:px-8 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

/**
 * Swipeable card carousel for the home rows (HOME-02..05). Wraps a native
 * scroll-snap rail — so touch swipe and trackpads work for free — and layers on
 * pointer drag-to-scroll plus flat, background-less edge arrows that page by
 * ~80% of the viewport. Dependency-free: no carousel library, arrow state is
 * driven straight off the rail's scroll position.
 *
 * Design system: no button chrome behind the arrows — just the lucide chevron,
 * white with reduced opacity, brightening on hover. Sharp, flat, no gradient.
 */
export function AnimeCarousel({
  children,
  prevLabel,
  nextLabel,
}: AnimeCarouselProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  // Drag-to-scroll state — mutated in handlers only, never during render.
  const drag = useRef({
    active: false,
    startX: 0,
    startScroll: 0,
    moved: false,
  });

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    const sync = () => {
      setCanLeft(rail.scrollLeft > 4);
      setCanRight(rail.scrollLeft + rail.clientWidth < rail.scrollWidth - 4);
    };

    // Defer the first measurement out of the effect body so it runs after
    // layout (and off the synchronous effect path).
    const raf = requestAnimationFrame(sync);
    rail.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      cancelAnimationFrame(raf);
      rail.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, [children]);

  const page = (direction: 1 | -1) => {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollBy({
      left: direction * rail.clientWidth * 0.8,
      behavior: "smooth",
    });
  };

  // Pointer drag — only for mouse/pen; touch keeps the native momentum scroll.
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch" || !railRef.current) return;
    drag.current = {
      active: true,
      startX: e.clientX,
      startScroll: railRef.current.scrollLeft,
      moved: false,
    };
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const rail = railRef.current;
    if (!rail || !drag.current.active) return;
    const dx = e.clientX - drag.current.startX;
    if (Math.abs(dx) > 4) drag.current.moved = true;
    rail.scrollLeft = drag.current.startScroll - dx;
  };

  const endDrag = () => {
    drag.current.active = false;
  };

  // Swallow the click that fires after a drag so a card link isn't followed.
  const onClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (drag.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      drag.current.moved = false;
    }
  };

  return (
    <div className="relative">
      <div
        ref={railRef}
        className={cn(railClass, "cursor-grab active:cursor-grabbing")}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onClickCapture={onClickCapture}
      >
        {children}
      </div>

      <button
        type="button"
        aria-label={prevLabel}
        onClick={() => page(-1)}
        className={cn(
          "absolute top-1/2 left-0 z-20 hidden -translate-y-1/2 items-center justify-center px-1 text-white/50 transition-opacity duration-200 hover:text-white sm:flex",
          canLeft ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <ChevronLeft
          className="size-10 lg:size-12"
          strokeWidth={2.5}
          aria-hidden
        />
      </button>

      <button
        type="button"
        aria-label={nextLabel}
        onClick={() => page(1)}
        className={cn(
          "absolute top-1/2 right-0 z-20 hidden -translate-y-1/2 items-center justify-center px-1 text-white/50 transition-opacity duration-200 hover:text-white sm:flex",
          canRight ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <ChevronRight
          className="size-10 lg:size-12"
          strokeWidth={2.5}
          aria-hidden
        />
      </button>
    </div>
  );
}
