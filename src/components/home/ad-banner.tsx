"use client";

import { useEffect, useRef } from "react";

import {
  adPlacement,
  type AdPlacementName,
  type AdUnit,
} from "@/lib/ads/placements";
import { cn } from "@/lib/utils";

/** Matches Tailwind's `md:` — the breakpoint the reserved slot switches size at. */
const DESKTOP_QUERY = "(min-width: 768px)";

/** How long one unit may hold the loader queue before the next one starts. */
const LOADER_TIMEOUT_MS = 5_000;

/**
 * How long a unit gets to put an ad in its box after its loader has run,
 * before the placement's fallback is given the box instead. Both networks
 * insert their frame a moment after the loader's `load` event, so this is a
 * grace period, not a deadline.
 */
const FILL_GRACE_MS = 3_000;

/** True once something other than a loader script sits in the box. */
function hasRendered(container: HTMLDivElement): boolean {
  return Array.from(container.children).some(
    (child) => child.tagName !== "SCRIPT",
  );
}

/**
 * Adsterra's `invoke.js` reads a GLOBAL `atOptions` when it executes, so two
 * units loading concurrently on the same page can each pick up the other's
 * config. Units are therefore mounted one after another: each waits for the
 * previous loader to fire `load` (or to time out) before writing `atOptions`.
 */
let loaderChain: Promise<void> = Promise.resolve();

/**
 * HilltopAds' loader reads its options off a `settings` property hung on its
 * own script element, and `appendTo` is the one that matters here: without it
 * the ad is inserted next to whichever script element the loader finds, which
 * is not necessarily our reserved box.
 */
interface HilltopScript extends HTMLScriptElement {
  settings?: { appendTo: string };
}

/** Appends one unit's loader into `container`, resolving when it settles. */
function mountUnit(
  container: HTMLDivElement,
  containerId: string,
  unit: AdUnit,
): Promise<void> {
  return new Promise((resolve) => {
    const loader = document.createElement("script") as HilltopScript;
    loader.type = "text/javascript";
    loader.async = true;

    if (unit.network === "hilltopads") {
      loader.src = unit.src;
      loader.settings = { appendTo: `#${containerId}` };
      // The network's own snippet sets this, and its ad server reads the
      // referring URL — keep it on the element rather than relying on the
      // document-level policy alone.
      loader.referrerPolicy = "no-referrer-when-downgrade";
    } else {
      // Adsterra's loader reads a global `atOptions` written immediately
      // before it, and locates its insertion point via `document.currentScript`
      // — so both scripts have to live inside the target container.
      const configScript = document.createElement("script");
      configScript.type = "text/javascript";
      configScript.text = `atOptions = {
      'key': '${unit.key}',
      'format': 'iframe',
      'height': ${unit.height},
      'width': ${unit.width},
      'params': {}
    };`;
      container.appendChild(configScript);

      loader.src = `${unit.host}/${unit.key}/invoke.js`;
    }

    let settled = false;
    const release = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve();
    };
    // A blocked loader (ad blocker, dead host) must not strand the queue.
    const timer = setTimeout(release, LOADER_TIMEOUT_MS);
    loader.addEventListener("load", release);
    loader.addEventListener("error", release);

    container.appendChild(loader);
  });
}

interface AdBannerProps {
  /** Which ad unit this slot carries — see `@/lib/ads/placements`. */
  placement: AdPlacementName;
  /** Spacing for the slot, so each host page keeps its own rhythm. */
  className?: string;
}

/**
 * One ad slot (HOME-08), carried by the home, anime, episodes and watch pages
 * — always between two sections rather than inside one, so nothing it loads
 * can push a layout around. Both networks locate their insertion point from
 * the loader script's own position in the DOM, so the scripts are created and
 * appended imperatively into the target div rather than mounted through
 * `next/script` (which detaches them from that DOM position).
 *
 * The slot's box is reserved in CSS at the same `md` breakpoint the unit is
 * chosen at, so the 300x250 (phones) and 728x90 (desktop) boxes are laid out
 * before any script runs and the ad never shifts the page. Once a unit is
 * picked the box is pinned to that unit's proportions and the unit is rescaled
 * to fit whatever width the box currently has, so the two can never disagree.
 */
export function AdBanner({ placement, className }: AdBannerProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { desktop, mobile, desktopFallback } = adPlacement(placement);
  // HilltopAds is handed a selector rather than an element, so the box needs a
  // real id. Placements are unique per page, which makes this unique too.
  const containerId = `ad-slot-${placement}`;

  useEffect(() => {
    const box = boxRef.current;
    const container = containerRef.current;
    if (!box || !container) return;

    // The reserved box already committed to a size at this breakpoint; pick the
    // unit that matches it, falling back to the other half when a placement
    // only has one unit configured.
    const wide = window.matchMedia(DESKTOP_QUERY).matches;
    const unit = wide ? (desktop ?? mobile) : (mobile ?? desktop);
    if (!unit) return;

    // From here the box follows the MOUNTED unit rather than the `md`
    // breakpoint. The two agree on first paint but drift apart the moment the
    // viewport crosses 768px afterwards — a phone turned sideways, a window
    // dragged wider — and the loaded ad is not re-picked to match, so a 300x250
    // left in a 728x90 box had everything below its first 90px cut away by the
    // box's `overflow-hidden`.
    box.style.aspectRatio = `${unit.width} / ${unit.height}`;
    box.style.maxWidth = `${unit.width}px`;

    // The loader box is absolutely positioned, so sizing it here is
    // layout-neutral — nothing below it moves. Scaling to the box's CURRENT
    // width keeps the whole unit visible on viewports narrower than it is, and
    // the box's height follows the same ratio, so nothing is ever clipped.
    container.style.width = `${unit.width}px`;
    container.style.height = `${unit.height}px`;

    const fit = () => {
      const scale = Math.min(1, box.clientWidth / unit.width);
      container.style.transform = `scale(${scale})`;
    };
    fit();
    // Rotation and resize change the box's width without re-running this
    // effect; the scale has to be recomputed or the unit stops fitting.
    const observer = new ResizeObserver(fit);
    observer.observe(box);

    // Scripts are appended once — a second run (React's development remount)
    // must resize the box without loading another ad into it.
    const mounted = container.childElementCount > 0;

    // Only the unit the box was sized for has a stand-in — a 728x90 fallback
    // dropped into a 300x250 box would be worse than the empty box it fills.
    const fallback = unit === desktop ? desktopFallback : null;

    let cancelled = false;
    if (!mounted) {
      loaderChain = loaderChain.then(async () => {
        if (cancelled) return;
        await mountUnit(container, containerId, unit);
        if (cancelled || !fallback) return;

        // Held inside the queue so the fallback's own loader still gets the
        // globals to itself. The placements that have a fallback carry one slot
        // per page, so nothing is waiting behind this.
        await new Promise((resolve) => setTimeout(resolve, FILL_GRACE_MS));
        if (cancelled || hasRendered(container)) return;

        await mountUnit(container, containerId, fallback);
      });
    }

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [desktop, mobile, desktopFallback, containerId]);

  if (!desktop && !mobile) return null;

  const boxClassName =
    desktop && mobile
      ? "aspect-[300/250] max-w-[300px] md:aspect-[728/90] md:max-w-[728px]"
      : mobile
        ? "aspect-[300/250] max-w-[300px]"
        : "aspect-[728/90] max-w-[728px]";

  return (
    <div className={cn("w-full px-4", className)}>
      <div
        ref={boxRef}
        className={cn(
          "relative mx-auto w-full overflow-hidden bg-black",
          boxClassName,
        )}
      >
        <div
          ref={containerRef}
          id={containerId}
          className="absolute top-0 left-0 origin-top-left"
        />
      </div>
    </div>
  );
}
