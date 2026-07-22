import {
  FileText,
  Image as ImageIcon,
  LayoutDashboard,
  Megaphone,
  type LucideIcon,
} from "lucide-react";

/**
 * A single admin sidebar destination. `key` resolves under the `admin.nav`
 * i18n namespace; `icon` is a lucide glyph (no emoji — design system).
 */
export interface AdminNavItem {
  key: string;
  href: string;
  icon: LucideIcon;
}

/**
 * Admin panel navigation (EPIC-12). Entries are added here as each module lands
 * (ads — ADMIN-02, backgrounds — ADMIN-04, blogs — ADMIN-05, users — ADMIN-06),
 * so the sidebar only ever links to routes that exist.
 */
export const ADMIN_NAV: AdminNavItem[] = [
  { key: "dashboard", href: "/admin", icon: LayoutDashboard },
  { key: "ads", href: "/admin/ads", icon: Megaphone },
  { key: "backgrounds", href: "/admin/backgrounds", icon: ImageIcon },
  { key: "blogs", href: "/admin/blogs", icon: FileText },
];
