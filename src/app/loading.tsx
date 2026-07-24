import { PageLoader } from "@/components/ui/page-loader";

/**
 * Root App Router loading UI. Next.js renders this automatically during
 * navigation to any route that streams server data, and every current or
 * future route segment without its own `loading.tsx` inherits it — so the
 * morphing spinner shows on page transitions across the whole app.
 */
export default function Loading() {
  return <PageLoader />;
}
