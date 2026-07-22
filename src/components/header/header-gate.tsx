"use client";

import { usePathname } from "next/navigation";

/**
 * Hides the public site header on the admin panel (EPIC-12), which ships its
 * own chrome (sidebar + topbar). The header is rendered from the root layout on
 * every route, so this client gate keeps the two navigations from stacking
 * without splitting the app into route groups.
 */
export function HeaderGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;
  return <>{children}</>;
}
