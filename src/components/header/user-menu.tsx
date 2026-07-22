"use client";

import { Avatar } from "@base-ui/react/avatar";
import { Menu } from "@base-ui/react/menu";
import { LogOut, User } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Authenticated user as consumed by the header. Kept intentionally minimal and
 * local so this component stays decoupled from the auth implementation
 * (EPIC-02): the session is wired in once, in `SiteHeader`, when it lands.
 */
export interface SessionUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

interface UserMenuProps {
  user?: SessionUser | null;
  /** Where the login button points (Google login flow lives in EPIC-10). */
  loginHref?: string;
  profileHref?: string;
  /** Sign-out endpoint (NextAuth's default GET route by convention). */
  signOutHref?: string;
}

function initials(user: SessionUser): string {
  const source = user.name?.trim() || user.email?.trim() || "";
  if (!source) return "U";
  const parts = source.split(/\s+/);
  const letters =
    parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : source[0];
  return letters.toUpperCase();
}

const itemClass =
  "text-muted-foreground data-highlighted:bg-muted data-highlighted:text-foreground flex cursor-pointer items-center gap-2 px-3 py-2 text-sm transition-colors outline-none select-none";

/**
 * Header right slot (HEADER-04): a Login button when signed out, or the profile
 * avatar with a dropdown (Profile / Log out) when signed in.
 */
export function UserMenu({
  user,
  loginHref = "/login",
  profileHref = "/profile",
  signOutHref = "/api/auth/signout",
}: UserMenuProps) {
  const t = useTranslations("auth");

  if (!user) {
    return (
      <Button nativeButton={false} render={<Link href={loginHref} />}>
        {t("login")}
      </Button>
    );
  }

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={t("profile")}
        className="focus-visible:ring-ring inline-flex outline-none focus-visible:ring-2"
      >
        <Avatar.Root className="bg-secondary text-secondary-foreground border-border inline-flex size-9 items-center justify-center overflow-hidden border align-middle text-sm font-medium select-none">
          {user.image && (
            <Avatar.Image
              src={user.image}
              alt={user.name ?? ""}
              className="size-full object-cover"
            />
          )}
          <Avatar.Fallback className="flex size-full items-center justify-center">
            {initials(user)}
          </Avatar.Fallback>
        </Avatar.Root>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner
          className="z-50 outline-none"
          sideOffset={8}
          align="end"
        >
          <Menu.Popup
            className={cn(
              "bg-popover text-popover-foreground border-border min-w-48 border p-1 shadow-lg outline-none",
              "origin-[var(--transform-origin)] transition-[transform,opacity] duration-150",
              "data-starting-style:scale-95 data-starting-style:opacity-0",
              "data-ending-style:scale-95 data-ending-style:opacity-0",
            )}
          >
            {(user.name || user.email) && (
              <div className="border-border truncate border-b px-3 py-2 text-sm">
                <p className="text-foreground truncate font-medium">
                  {user.name ?? user.email}
                </p>
                {user.name && user.email && (
                  <p className="text-muted-foreground truncate text-xs">
                    {user.email}
                  </p>
                )}
              </div>
            )}
            <Menu.Item
              className={itemClass}
              render={<Link href={profileHref} />}
            >
              <User className="size-4" />
              {t("profile")}
            </Menu.Item>
            <Menu.Item className={itemClass} render={<a href={signOutHref} />}>
              <LogOut className="size-4" />
              {t("logout")}
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
