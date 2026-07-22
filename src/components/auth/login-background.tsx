/**
 * Atmospheric login background (LOGIN-02).
 *
 * The reference `login_sehifesi___tablet_ve_yuxari_olculer_ucun.mov` is a dark,
 * cinematic, defocused environment in a cool slate blue-grey — measured average
 * RGB ≈ (80, 99, 115), i.e. ~#4F6373 — that drifts very slowly ("dreamy"
 * parallax, no cuts or flashes) and keeps a calm, darker centre for the login
 * card (DESIGN-SPEC.md §6.1). Until an admin uploads a real background video
 * (ADMIN-04), this is a CSS recreation — matching the search/profile pages'
 * approach ({@link import("@/components/profile/profile-background").ProfileBackground}):
 * slate-blue radial glows over the black base with a brief fade-in from black.
 * Purely decorative — fixed behind the page, non-interactive and hidden from
 * assistive tech. The same layer serves mobile via `object-fit`-style full-bleed
 * cover, so no separate mobile crop is needed (LOGIN-02).
 *
 * The soft glows are a deliberate exception to the no-gradient UI rule, allowed
 * only on this photographic background layer; the login card on top stays flat.
 */
export function LoginBackground() {
  return (
    <div
      aria-hidden
      className="login-atmosphere pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-black"
    >
      {/* Primary slate-blue haze, upper-left — the dominant atmospheric tone. */}
      <div
        className="login-atmosphere-glow absolute -top-1/4 -left-1/4 h-[85vh] w-[85vh] blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(80,99,115,0.45) 0%, rgba(60,76,90,0.20) 45%, transparent 72%)",
        }}
      />
      {/* Secondary, deeper glow — lower-right, offset and out of phase for motion. */}
      <div
        className="login-atmosphere-glow absolute -right-1/4 bottom-0 h-[65vh] w-[65vh] blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(70,90,108,0.32) 0%, transparent 68%)",
          animationDelay: "-6s",
          animationDuration: "18s",
        }}
      />
      {/* Vignette — sinks the edges and centre to black so the card stays legible. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(0,0,0,0.35) 20%, rgba(0,0,0,0.78) 100%)",
        }}
      />
    </div>
  );
}
