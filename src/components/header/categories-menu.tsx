"use client";

import { Menu } from "@base-ui/react/menu";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import type { Category } from "@/lib/anime/genres";
import { cn } from "@/lib/utils";

const triggerClass =
  "group text-muted-foreground hover:text-foreground data-popup-open:text-foreground inline-flex items-center gap-1 px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:text-foreground";

const itemClass =
  "text-muted-foreground data-highlighted:bg-muted data-highlighted:text-foreground flex cursor-pointer items-center px-3 py-2 text-sm transition-colors outline-none select-none";

/**
 * Categories dropdown (HEADER-02). Genres come from the server (Consumet +
 * Redis, long TTL — see `getCategories`) and are laid out in a multi-column
 * grid (stacked and side-by-side). Each entry links to its genre browse route.
 */
export function CategoriesMenu({ categories }: { categories: Category[] }) {
  const t = useTranslations("nav");

  if (categories.length === 0) return null;

  return (
    <Menu.Root>
      <Menu.Trigger className={triggerClass}>
        {t("categories")}
        <ChevronDown className="size-4 transition-transform group-data-[popup-open]:rotate-180" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner
          className="z-50 outline-none"
          sideOffset={8}
          align="start"
        >
          <Menu.Popup
            className={cn(
              "bg-popover text-popover-foreground border-border grid max-w-[min(90vw,32rem)]",
              "grid-cols-2 gap-x-2 border p-2 shadow-lg outline-none sm:grid-cols-3",
              "origin-[var(--transform-origin)] transition-[transform,opacity] duration-150",
              "data-starting-style:scale-95 data-starting-style:opacity-0",
              "data-ending-style:scale-95 data-ending-style:opacity-0",
            )}
          >
            {categories.map((category) => (
              <Menu.Item
                key={category.slug}
                className={itemClass}
                render={<Link href={`/genre/${category.slug}`} />}
              >
                {category.name}
              </Menu.Item>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
