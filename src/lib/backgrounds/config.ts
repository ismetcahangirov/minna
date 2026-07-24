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
  admin: ["mobile", "desktop"],
};

/** Active override urls for a page, keyed by breakpoint variant. */
export type BackgroundSources = Partial<Record<BackgroundVariant, string>>;

/**
 * Built-in default background videos, hosted on Cloudinary (cloud `faipbugz`).
 * These are the code-level defaults every page shows when no admin override is
 * active — the public render path merges them under the DB overrides
 * (`{ ...DEFAULT_BACKGROUNDS[page], ...overrides }`), while the admin panel keeps
 * listing only real overrides. The per-page CSS atmosphere stays underneath as
 * the ultimate fallback if a video fails to load. Raw (untransformed) delivery
 * urls, keyed by breakpoint variant; the admin `desktop` source is the uploaded
 * GIF transcoded to mp4.
 */
const CLOUDINARY_BG = (id: string): string =>
  `https://res.cloudinary.com/faipbugz/video/upload/minna/bg/${id}.mp4`;

export const DEFAULT_BACKGROUNDS: Record<BackgroundPage, BackgroundSources> = {
  login: { desktop: CLOUDINARY_BG("login-desktop") },
  profile: {
    mobile: CLOUDINARY_BG("profile-mobile"),
    desktop: CLOUDINARY_BG("profile-desktop"),
  },
  search: { desktop: CLOUDINARY_BG("search-desktop") },
  not_found: { desktop: CLOUDINARY_BG("not-found-desktop") },
  admin: {
    mobile: CLOUDINARY_BG("admin-mobile"),
    // The admin desktop source was an animated GIF; Cloudinary's video pipeline
    // rejects gif uploads, so it is stored as an image and delivered as mp4 from
    // the image pipeline instead of `/video/upload/`.
    desktop:
      "https://res.cloudinary.com/faipbugz/image/upload/minna/bg/admin-desktop.mp4",
  },
};

export function isBackgroundPage(value: string): value is BackgroundPage {
  return (BACKGROUND_PAGES as readonly string[]).includes(value);
}

export function isBackgroundVariant(value: string): value is BackgroundVariant {
  return (BACKGROUND_VARIANTS as readonly string[]).includes(value);
}
