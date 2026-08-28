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
 * before any script runs and the ad never shifts the page. The loaded unit is
 * then scaled to the measured box, which only matters on viewports narrower
 * than the unit itself.
 */
export function AdBanner({ placement, className }: AdBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { desktop, mobile } = adPlacement(placement);
  // HilltopAds is handed a selector rather than an element, so the box needs a
  // real id. Placements are unique per page, which makes this unique too.
  const containerId = `ad-slot-${placement}`;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || container.childElementCount > 0) return;

    // The reserved box already committed to a size at this breakpoint; pick the
    // unit that matches it, falling back to the other half when a placement
    // only has one unit configured.
    const wide = window.matchMedia(DESKTOP_QUERY).matches;
    const unit = wide ? (desktop ?? mobile) : (mobile ?? desktop);
    if (!unit) return;

    // The loader box is absolutely positioned, so sizing it here is
    // layout-neutral — nothing below it moves.
    const box = container.parentElement;
    const scale = box ? Math.min(1, box.clientWidth / unit.width) : 1;
    container.style.width = `${unit.width}px`;
    container.style.height = `${unit.height}px`;
    container.style.transform = `scale(${scale})`;

    let cancelled = false;
    loaderChain = loaderChain.then(() =>
      cancelled ? undefined : mountUnit(container, containerId, unit),
    );

    return () => {
      cancelled = true;
    };
  }, [desktop, mobile, containerId]);

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
