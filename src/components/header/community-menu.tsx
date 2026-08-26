"use client";

import { Menu } from "@base-ui/react/menu";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

import { COMMUNITY_ITEMS } from "@/components/header/nav-config";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const triggerClass =
  "group text-muted-foreground hover:text-foreground data-popup-open:text-foreground focus-visible:text-foreground inline-flex items-center gap-1 px-3 py-2 text-sm font-medium transition-colors outline-none";

const itemClass =
  "text-muted-foreground data-highlighted:bg-muted data-highlighted:text-foreground flex cursor-pointer items-center gap-2 px-3 py-2 text-sm transition-colors outline-none select-none";

/**
 * The Community menu in the desktop header: discussions, the viewer's library
 * and the member directory.
 *
 * Grouped behind one trigger rather than added as three more top-level links,
 * which would crowd the nav out of its row at the `lg` breakpoint. The trigger
 * takes the red accent while the viewer is anywhere inside the group, so the
 * header still says where they are.
 */
export function CommunityMenu() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const inside = COMMUNITY_ITEMS.some(
    ({ href }) => pathname === href || pathname.startsWith(`${href}/`),
  );

  return (
    <Menu.Root>
      <Menu.Trigger className={cn(triggerClass, inside && "text-primary")}>
        {t("community")}
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
              "bg-popover text-popover-foreground border-border min-w-48 border p-1 shadow-lg outline-none",
              "origin-[var(--transform-origin)] transition-[transform,opacity] duration-150",
              "data-starting-style:scale-95 data-starting-style:opacity-0",
              "data-ending-style:scale-95 data-ending-style:opacity-0",
            )}
          >
            {COMMUNITY_ITEMS.map(({ href, labelKey, icon: Icon }) => (
              <Menu.Item
                key={href}
                className={itemClass}
                render={<Link href={href} />}
              >
                <Icon className="size-4" />
                {t(labelKey)}
              </Menu.Item>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
