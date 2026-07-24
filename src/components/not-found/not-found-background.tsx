import { BackgroundVideoLayer } from "@/components/backgrounds/background-video-layer";
import { getResolvedBackgroundSources } from "@/lib/backgrounds/queries";

/**
 * Atmospheric 404 background (404-02).
 *
 * The reference `404_sehifesi_.mov` is the warmest, brightest of the atmospheric
 * scenes — a smouldering brown-orange "ember / bad signal" glow (measured average
 * RGB ~= (138, 97, 84), i.e. ~#8A6154) whose brightness pulses very gently in a
 * sinusoidal "breathing ember" rhythm, leaving the centre clear for the 404
 * graphic (DESIGN-SPEC.md §6.4). Until an admin uploads a real background video
 * (ADMIN-04), this is a CSS recreation — matching the search/login/profile
 * approach ({@link import("@/components/search/search-background").SearchBackground}):
 * warm ember radial glows over the black base with a slow brightness pulse.
 * Purely decorative — fixed behind the page, non-interactive and hidden from
 * assistive tech.
 *
 * The warm glow is a deliberate exception to the no-gradient UI rule, allowed
 * only on this photographic background layer; the 404 graphic on top stays flat,
 * hard-cornered and glow-free (DESIGN-SPEC.md §6.4).
 */
export async function NotFoundBackground() {
  const sources = await getResolvedBackgroundSources("not_found");

  return (
    <div
      aria-hidden
      className="notfound-atmosphere pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-black"
    >
      {/* Primary ember, lower-centre — the dominant warm brown-orange tone. */}
      <div
        className="notfound-atmosphere-glow absolute top-1/2 left-1/2 h-[85vh] w-[85vh] -translate-x-1/2 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(138,97,84,0.42) 0%, rgba(110,72,58,0.20) 45%, transparent 72%)",
        }}
      />
      {/* Secondary, deeper ember — offset and out of phase for the flicker. */}
      <div
        className="notfound-atmosphere-glow absolute top-1/3 -right-1/4 h-[60vh] w-[60vh] blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(150,100,80,0.30) 0%, transparent 68%)",
          animationDelay: "-1.8s",
          animationDuration: "4.5s",
        }}
      />
      {/* Vignette — sinks the edges to black so the 404 content stays legible. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 28%, rgba(0,0,0,0.70) 100%)",
        }}
      />

      {/* Admin override (ADMIN-04) — covers the CSS default when present. */}
      <BackgroundVideoLayer sources={sources} />
    </div>
  );
}
