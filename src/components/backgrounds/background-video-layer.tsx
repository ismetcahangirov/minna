import type { BackgroundSources } from "@/lib/backgrounds/config";

function isAnimatedImageSource(src: string | undefined): src is string {
  if (!src) return false;
  const normalized = src.toLowerCase();
  return (
    normalized.includes("f_webp") ||
    normalized.includes("fl_awebp") ||
    normalized.includes("fl_animated") ||
    normalized.split("?")[0].endsWith(".webp")
  );
}

function BackgroundMedia({
  src,
  className,
}: {
  src: string;
  className: string;
}) {
  if (isAnimatedImageSource(src)) {
    return (
      <span
        aria-hidden
        className={`${className} bg-cover bg-center`}
        style={{ backgroundImage: `url("${src}")` }}
      />
    );
  }

  return (
    <video
      className={className}
      src={src}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
    />
  );
}

/**
 * Renders an admin-supplied atmospheric background asset over a page's built-in
 * CSS default (ADMIN-04). Default and legacy overrides remain videos; newly
 * uploaded admin overrides are stored as animated WebP Cloudinary derivatives
 * and rendered as a CSS background image.
 *
 * When a page authors separate mobile and desktop sources (profile), both are
 * rendered and toggled by breakpoint; a single source covers every breakpoint,
 * and a missing breakpoint falls back to the other.
 */
export function BackgroundVideoLayer({
  sources,
}: {
  sources: BackgroundSources;
}) {
  const desktop = sources.desktop ?? sources.tablet ?? sources.mobile;
  if (!desktop) return null;

  const mobile = sources.mobile ?? desktop;
  const common = "absolute inset-0 h-full w-full object-cover";

  if (desktop === mobile) {
    return <BackgroundMedia className={common} src={desktop} />;
  }

  return (
    <>
      <BackgroundMedia className={`${common} lg:hidden`} src={mobile} />
      <BackgroundMedia className={`${common} hidden lg:block`} src={desktop} />
    </>
  );
}
