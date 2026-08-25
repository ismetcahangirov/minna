import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { cn } from "@/lib/utils";

interface SimplePagerProps {
  /** Route the pages live under, e.g. `/discussions`. */
  basePath: string;
  /** 1-based page currently rendered. */
  page: number;
  /** Whether a further page exists — the listings answer this without a count. */
  hasNextPage: boolean;
  /** Extra query params carried across page changes (a search term, a tab). */
  params?: Record<string, string | number | null | undefined>;
}

const LINK_BASE =
  "border-border bg-surface text-foreground hover:border-primary/60 hover:text-primary flex h-9 items-center gap-1 border px-3 text-xs font-semibold transition-colors sm:text-sm";

/**
 * Previous / next pager for the community listings.
 *
 * These listings deliberately never count their rows — they read one row past
 * the page to learn whether another exists — so there is no total to render
 * numbered links from. Each page is still a real `<a href>` carrying `?page=`,
 * so pages stay linkable and survive a reload with no client state.
 */
export async function SimplePager({
  basePath,
  page,
  hasNextPage,
  params = {},
}: SimplePagerProps) {
  if (page <= 1 && !hasNextPage) return null;

  const t = await getTranslations("common");

  const href = (target: number) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== null && value !== undefined && value !== "") {
        query.set(key, String(value));
      }
    }
    if (target > 1) query.set("page", String(target));
    const search = query.toString();
    return search ? `${basePath}?${search}` : basePath;
  };

  return (
    <nav
      aria-label={t("pagination")}
      className="mt-8 flex items-center justify-center gap-2"
    >
      {page > 1 ? (
        <Link href={href(page - 1)} rel="prev" className={LINK_BASE}>
          <ChevronLeft className="size-4" aria-hidden />
          <span>{t("previous")}</span>
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className={cn(LINK_BASE, "pointer-events-none opacity-40")}
        >
          <ChevronLeft className="size-4" aria-hidden />
          <span>{t("previous")}</span>
        </span>
      )}

      <span className="text-muted-foreground px-2 text-xs sm:text-sm">
        {page}
      </span>

      {hasNextPage ? (
        <Link href={href(page + 1)} rel="next" className={LINK_BASE}>
          <span>{t("next")}</span>
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className={cn(LINK_BASE, "pointer-events-none opacity-40")}
        >
          <span>{t("next")}</span>
          <ChevronRight className="size-4" aria-hidden />
        </span>
      )}
    </nav>
  );
}
