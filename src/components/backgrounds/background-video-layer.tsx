import type { BackgroundSources } from "@/lib/backgrounds/config";

/**
 * Renders an admin-supplied atmospheric background video over a page's built-in
 * CSS default (ADMIN-04). Full-bleed, `object-cover`, and — per the atmospheric
 * skill — always `muted`, `loop`, `playsinline` and autoplaying so it behaves as
 * a silent decorative layer. Returns `null` when no override exists, leaving the
 * default visible underneath.
 *
 * When a page authors separate mobile and desktop sources (profile), both are
 * rendered and toggled by breakpoint; a single source covers every breakpoint,
 * and a missing breakpoint falls back to the other (e.g. login mobile reuses the
 * desktop/tablet video — atmospheric skill rule 5).
 */
export function BackgroundVideoLayer({
  sources,
}: {
  sources: BackgroundSources;
}) {
  const desktop = sources.desktop ?? sources.tablet ?? sources.mobile;
  const mobile = sources.mobile ?? desktop;

  if (!desktop && !mobile) return null;

  const common = "absolute inset-0 h-full w-full object-cover";

  if (desktop === mobile) {
    return (
      <video
        className={common}
        src={desktop}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
      />
    );
  }

  return (
    <>
      <video
        className={`${common} lg:hidden`}
        src={mobile}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
      />
      <video
        className={`${common} hidden lg:block`}
        src={desktop}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
      />
    </>
  );
}
