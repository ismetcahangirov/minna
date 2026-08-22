import Image from "next/image";

/**
 * Backdrop for the anime detail hero (DETAIL-01), the LCP element through
 * `next/image` `priority`. Purely presentational, so no client runtime.
 *
 * A phone caps it to a strip across the top instead of letting it fill the
 * hero. Covering a ~380x660 portrait box with a 1900x400 banner showed about a
 * tenth of the artwork and scaled it up on the way — cropped and smeared. As a
 * strip the same banner is scaled *down*, so it stays sharp and about a third
 * of it is visible. Its height is a share of the hero rather than of the
 * viewport or a fixed pixel count: the poster card is anchored to the bottom of
 * the hero, so only a hero-relative height keeps the strip ending just past it
 * — the artwork carries on behind the card instead of stopping level with it,
 * and the scrim fades that edge out. From `sm` up the hero is wide enough for
 * the original full-bleed treatment.
 */
export function DetailBanner({ src }: { src: string }) {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 h-[70%] overflow-hidden sm:inset-0 sm:h-auto"
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
