import { BackgroundVideoLayer } from "@/components/backgrounds/background-video-layer";
import { getBackgroundSources } from "@/lib/backgrounds/queries";

/**
 * Default atmospheric background for the admin panel (ADMIN-07). Deliberately
 * restrained — a near-black graphite base with a faint red-tinged glow — so it
 * never competes with the dense dashboard UI layered on top (the reference
 * `admin_sehifesi_mobil_ucun.mov` is a UI-behaviour demo, not a busy scene).
 *
 * An admin can replace it with a real video via the backgrounds manager
 * (ADMIN-04, "admin" page); this default lives in code and is never destroyed,
 * so clearing the override restores it. Purely decorative — fixed behind the
 * panel, non-interactive and hidden from assistive tech.
 *
 * The soft glows are the documented exception to the no-gradient UI rule, scoped
 * to this background layer; the dashboard UI on top stays flat and hard-cornered.
 */
export async function AdminBackground() {
  const sources = await getBackgroundSources("admin");

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-black"
    >
      {/* Faint deep-red glow, lower-left — the panel's only warm accent. */}
      <div
        className="absolute -bottom-1/4 -left-1/4 h-[70vh] w-[70vh] blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(60,20,24,0.28) 0%, rgba(30,12,14,0.12) 45%, transparent 72%)",
        }}
      />
      {/* Cool graphite counter-glow, upper-right — keeps the field from feeling flat. */}
      <div
        className="absolute -top-1/4 -right-1/4 h-[60vh] w-[60vh] blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(38,38,40,0.35) 0%, transparent 68%)",
        }}
      />
      {/* Vignette — sinks the edges so dense tables stay legible. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.6) 100%)",
        }}
      />

      {/* Admin override (ADMIN-04) — covers the default when present. */}
      <BackgroundVideoLayer sources={sources} />
    </div>
  );
}
