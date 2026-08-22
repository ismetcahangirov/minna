/**
 * The "current episode" marker: a light that runs around the row's outline
 * without stopping, reading as current flowing through it. Four solid segments,
 * one per edge, each lit for its quarter of the cycle so a single beam appears
 * to circulate clockwise (keyframes in `globals.css`).
 *
 * Solid colour and sharp edges only — no gradient, no blur — and it disappears
 * under `prefers-reduced-motion`, leaving the static red border behind.
 */
export function CurrentEpisodeBeam() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <span className="episode-beam episode-beam-top bg-primary absolute top-0 left-0 h-0.5 w-1/4" />
      <span className="episode-beam episode-beam-right bg-primary absolute top-0 right-0 h-1/4 w-0.5" />
      <span className="episode-beam episode-beam-bottom bg-primary absolute right-0 bottom-0 h-0.5 w-1/4" />
      <span className="episode-beam episode-beam-left bg-primary absolute bottom-0 left-0 h-1/4 w-0.5" />
    </span>
  );
}
