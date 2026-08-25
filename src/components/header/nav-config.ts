import {
  Flame,
  Heart,
  Library,
  MessagesSquare,
  Newspaper,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import type { ComponentType } from "react";

/** A primary navigation entry (HEADER-03). */
export interface NavItem {
  href: string;
  /** Key under the `nav` namespace in the message catalogs. */
  labelKey: "favorites" | "new" | "popular" | "blogs" | "search";
  icon: ComponentType<{ className?: string }>;
}

/**
 * The header navigation links, in display order. Target routes are built in
 * later epics (Favorites/Popular/Blogs = EPIC-08, Search = EPIC-07); linking
 * to them now keeps the header the single source of truth for the site's IA.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/new", labelKey: "new", icon: Sparkles },
  { href: "/popular", labelKey: "popular", icon: Flame },
  { href: "/favorites", labelKey: "favorites", icon: Heart },
  { href: "/blogs", labelKey: "blogs", icon: Newspaper },
  { href: "/search", labelKey: "search", icon: Search },
] as const;

/** An entry in the Community menu (COMM-03 / LIB-03 / MEM-02). */
export interface CommunityItem {
  href: string;
  /** Key under the `nav` namespace in the message catalogs. */
  labelKey: "discussions" | "library" | "members";
  icon: ComponentType<{ className?: string }>;
}

/**
 * The member-facing corner of the site, grouped behind one header menu rather
 * than three more top-level links: discussions, the viewer's own library, and
 * the member directory.
 */
export const COMMUNITY_ITEMS: readonly CommunityItem[] = [
  { href: "/discussions", labelKey: "discussions", icon: MessagesSquare },
  { href: "/library", labelKey: "library", icon: Library },
  { href: "/users", labelKey: "members", icon: Users },
] as const;
