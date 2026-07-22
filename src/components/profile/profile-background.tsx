import { BackgroundVideoLayer } from "@/components/backgrounds/background-video-layer";
import { getBackgroundSources } from "@/lib/backgrounds/queries";

/**
 * Atmospheric profile background (PROFILE-02).
 *
 * The references `profil_sehifesi_mobil_ucun.mov` (mobile) and
 * `profil_sehifesi_tablet_ve_web_ucun.mov` (tablet/web) are dark, warm brown-grey
 * scenes that fade in from black and drift slowly, keeping the centre clear for
 * the profile card (DESIGN-SPEC.md §6.2). Until an admin uploads real background
 * videos (ADMIN-04), this is a CSS recreation — matching the search page's
 * approach ({@link import("@/components/search/search-background").SearchBackground}):
 * low-brightness warm/green-grey radial glows over the black base, with a brief
 * fade-in from black (the mobile reference's entrance). Purely decorative —
 * fixed behind the page, non-interactive and hidden from assistive tech.
 *
 * The soft glows are a deliberate exception to the no-gradient UI rule, allowed
 * only on this photographic background layer; the profile UI on top stays flat.
 */
export async function ProfileBackground() {
  const sources = await getBackgroundSources("profile");

  return (
    <div
      aria-hidden
      className="profile-atmosphere pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-black"
    >
      {/* Warm brown-grey glow, lower-centre — leaves the top clear for the card. */}
      <div
        className="profile-atmosphere-glow absolute top-1/2 left-1/2 h-[85vh] w-[85vh] -translate-x-1/2 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(64,59,60,0.55) 0%, rgba(48,44,45,0.28) 45%, transparent 72%)",
        }}
      />
      {/* Cooler green-grey secondary glow (tablet/web tone), offset and out of phase. */}
      <div
        className="profile-atmosphere-glow absolute top-1/3 -right-1/4 h-[60vh] w-[60vh] blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(60,62,59,0.40) 0%, transparent 68%)",
          animationDelay: "-6s",
          animationDuration: "20s",
        }}
      />
      {/* Vignette — sinks the edges to black so the profile content stays legible. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 25%, rgba(0,0,0,0.72) 100%)",
        }}
      />

      {/* Admin override (ADMIN-04) — covers the CSS default when present. */}
      <BackgroundVideoLayer sources={sources} />
    </div>
  );
}
