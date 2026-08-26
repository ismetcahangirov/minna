import { SpinnerMorph } from "@/components/ui/spinner-morph";
import { cn } from "@/lib/utils";

type PageLoaderProps = {
  /** Extra classes for the outer wrapper. */
  className?: string;
  /** Spinner size in px. */
  size?: number;
};

/**
 * Full-viewport, centered loading state. Used as the App Router `loading.tsx`
 * fallback so the morphing red spinner appears during route transitions while
 * the destination page's data streams in. Sits on the project's black
 * background with sharp edges — no gradient, blur, or radius.
 *
 * **Where a `loading.tsx` may be added.** A `loading.tsx` is a Suspense
 * boundary, and a boundary above a page means React flushes the shell — and
 * therefore the `200` — before the page has decided anything. A page that calls
 * `notFound()` under such a boundary can no longer set a status, so it answers
 * `200` with 404 content: a soft 404 that Search Console flags and that no
 * uptime check or CDN can see (#194). The same mechanism cost `permanentRedirect`
 * its `308` in #192.
 *
 * So the rule is: **a route that resolves a record and can call `notFound()`
 * gets no `loading.tsx`, and no ancestor of it may have one either** — the
 * boundary is inherited by every descendant segment. That is why the app has no
 * blanket `[locale]/loading.tsx` any more, and why `/`, `/blogs`, `/discussions`
 * and `/users` each sit in a `(…)` route group: the group holds the index page
 * and its loader without the record routes beside it inheriting the boundary.
 *
 * The cost is TTFB on the record routes: nothing is sent until the record is
 * resolved, because that is exactly the answer the status code depends on.
 *
 * The one deliberate exception is `[locale]/admin`, which keeps a segment-wide
 * loader over its two `[id]/edit` routes. Admin is behind auth and RBAC, carries
 * `noindex`, and is never crawled or monitored, so a soft 404 there costs
 * nothing that splitting the segment into three more route groups would buy.
 */
export function PageLoader({ className, size = 120 }: PageLoaderProps) {
  return (
    <div
      className={cn(
        "bg-background flex min-h-[70vh] w-full flex-1 items-center justify-center",
        className,
      )}
    >
      <SpinnerMorph size={size} />
    </div>
  );
}

export default PageLoader;
