import Image from "next/image";

/**
 * Static backdrop for the anime detail hero (DETAIL-01). Fills the hero with the
 * banner via `object-cover` only — no zoom/overscale — and stays the LCP element
 * through `next/image` `priority`. Purely presentational, so no client runtime.
 */
export function DetailBanner({ src }: { src: string }) {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
    >
      <Image
        src={src}
        alt=""
        fill
        priority
        quality={90}
        sizes="100vw"
        className="object-cover object-top opacity-90"
      />
    </div>
  );
}
