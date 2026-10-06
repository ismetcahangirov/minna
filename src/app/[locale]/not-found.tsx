import { NotFoundBackground } from "@/components/not-found/not-found-background";
import { NotFoundContent } from "@/components/not-found/not-found-content";

/**
 * Global 404 page (EPIC-11 / 404-01). The root `app/not-found.tsx` catches both
 * `notFound()` calls and any unmatched URL across the app, composing with the
 * root layout (header + footer) so the shell stays consistent. Next.js returns
 * the 404 status and injects `noindex` automatically, so no manual robots config
 * is needed here.
 *
 * Per DESIGN-SPEC.md §3.7 / §6.4 the large "404" sits in the foreground —
 * hard-cornered, flat, no glow — with the localized message and a single route
 * back home, layered over the atmospheric ember background (404-02).
 */
export default function NotFound() {
  return (
    <>
      <NotFoundBackground />
      <NotFoundContent />
    </>
  );
}
