"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

const ADSTERRA_KEY = "457046751eadca952094de44e01be6ec";

/**
 * Loader host for this ad unit. Adsterra hands out several — the one in the
 * unit's own GET CODE snippet is the only one that fills: a different host
 * answers 200 and even builds the container, then leaves it empty, because the
 * key is not registered there. Copy this from the dashboard, never from memory.
 */
const ADSTERRA_HOST = "https://www.highrevenueformat.com";
const AD_WIDTH = 728;
const AD_HEIGHT = 90;

interface AdBannerProps {
  /** Spacing for the slot, so each host page keeps its own rhythm. */
  className?: string;
}

/**
 * Adsterra 728x90 banner (HOME-08), carried by the home, anime, episodes and
 * watch pages — one slot per page, always between two sections rather than
 * inside one, so nothing it loads can push a layout around. Adsterra's
 * invoke.js locates its insertion point via `document.currentScript`, so the
 * config/invoke scripts must be created and appended imperatively into the
 * target div rather than mounted through `next/script` (which detaches them
 * from that DOM position). The fixed-size ad is scaled to the viewport with a
 * CSS container-query transform so it never overflows on mobile — no JS
 * media-query hook, consistent with the rest of the app.
 */
export function AdBanner({ className }: AdBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || container.childElementCount > 0) return;

    const configScript = document.createElement("script");
    configScript.type = "text/javascript";
    configScript.text = `atOptions = {
      'key': '${ADSTERRA_KEY}',
      'format': 'iframe',
      'height': ${AD_HEIGHT},
      'width': ${AD_WIDTH},
      'params': {}
    };`;
    container.appendChild(configScript);

    const invokeScript = document.createElement("script");
    invokeScript.type = "text/javascript";
    invokeScript.src = `${ADSTERRA_HOST}/${ADSTERRA_KEY}/invoke.js`;
    invokeScript.async = true;
    container.appendChild(invokeScript);
  }, []);

  return (
    <div
      className={cn("mx-auto w-full max-w-[728px] px-4", className)}
      style={{ containerType: "inline-size" }}
    >
      <div className="relative aspect-[728/90] w-full overflow-hidden bg-black">
        <div
          ref={containerRef}
          className="absolute top-0 left-0 origin-top-left"
          style={{
            width: AD_WIDTH,
            height: AD_HEIGHT,
            transform: `scale(calc(100cqw / ${AD_WIDTH}px))`,
          }}
        />
      </div>
    </div>
  );
}
