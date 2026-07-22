/**
 * Atmospheric background configuration (ADMIN-04). Shared by the public resolver
 * that renders a page's background and the admin panel that manages overrides,
 * so the set of pages and per-page breakpoint variants stays in one place. The
 * values mirror the `background_page` / `background_variant` DB enums.
 */
export const BACKGROUND_PAGES = [
  "login",
  "profile",
  "search",
  "not_found",
  "admin",
] as const;

export type BackgroundPage = (typeof BACKGROUND_PAGES)[number];

export const BACKGROUND_VARIANTS = ["desktop", "mobile", "tablet"] as const;

export type BackgroundVariant = (typeof BACKGROUND_VARIANTS)[number];

/**
 * The breakpoint variants each page actually authors. Profile is designed as
 * mobile vs. tablet/web (`desktop`) separately (DESIGN-SPEC §6.2); the other
 * pages use a single `desktop` source that covers every breakpoint.
 */
export const BACKGROUND_PAGE_VARIANTS: Record<
  BackgroundPage,
  BackgroundVariant[]
> = {
  login: ["desktop"],
  profile: ["mobile", "desktop"],
  search: ["desktop"],
  not_found: ["desktop"],
  admin: ["desktop"],
};

/** Active override urls for a page, keyed by breakpoint variant. */
export type BackgroundSources = Partial<Record<BackgroundVariant, string>>;

export function isBackgroundPage(value: string): value is BackgroundPage {
  return (BACKGROUND_PAGES as readonly string[]).includes(value);
}

export function isBackgroundVariant(value: string): value is BackgroundVariant {
  return (BACKGROUND_VARIANTS as readonly string[]).includes(value);
}
