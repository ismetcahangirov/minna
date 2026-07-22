import { BackgroundVideoLayer } from "@/components/backgrounds/background-video-layer";
import { getBackgroundSources } from "@/lib/backgrounds/queries";

/**
 * Atmospheric search background (SEARCH-03).
 *
 * The reference `search_page.mov` is a calm, teal/turquoise "breathing" glow
 * that leaves the centre clear for the search panel (DESIGN-SPEC.md §6.3). Until
 * an admin uploads a real background video (ADMIN-04), this is a CSS recreation:
 * two slow teal radial glows over the black base. Purely decorative — fixed
 * behind the page, non-interactive and hidden from assistive tech.
 *
 * The teal accent is a deliberate exception to the no-gradient UI rule, allowed
 * only on this photographic background layer; the search UI on top stays flat.
 */
export async function SearchBackground() {
  const sources = await getBackgroundSources("search");

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-black"
    >
      {/* Primary glow — upper centre, leaves room for the search panel. */}
      <div
        className="search-atmosphere-glow absolute -top-1/4 left-1/2 h-[80vh] w-[80vh] -translate-x-1/2 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(60,150,125,0.30) 0%, rgba(38,110,96,0.12) 45%, transparent 70%)",
        }}
      />
      {/* Secondary, deeper glow — offset and out of phase for gentle motion. */}
      <div
        className="search-atmosphere-glow absolute top-1/3 -right-1/4 h-[60vh] w-[60vh] blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(45,130,120,0.22) 0%, transparent 68%)",
          animationDelay: "-4.5s",
          animationDuration: "11s",
        }}
      />
      {/* Vignette — sinks the edges to black so page content stays legible. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.65) 100%)",
        }}
      />

      {/* Admin override (ADMIN-04) — covers the CSS default when present. */}
      <BackgroundVideoLayer sources={sources} />
    </div>
  );
}
