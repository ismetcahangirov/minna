/**
 * Adsterra ad-unit registry (HOME-08).
 *
 * Every slot in the app used to share ONE unit key, which made the network's
 * dashboard useless for deciding where ads are worth carrying: home, detail,
 * episodes and watch impressions all landed in a single row, so per-placement
 * eCPM was unknowable. Each placement now reads its own key from the
 * environment, so a unit created per slot in the Adsterra dashboard reports
 * separately. Unset placements fall back to the original key, which keeps the
 * current behaviour until the dashboard units actually exist.
 *
 * Sizes are fixed per unit in the dashboard, so a slot that should also serve
 * phones needs a SECOND unit at a phone-friendly size: a 728x90 scaled into a
 * 360px viewport is ~44px tall and effectively unviewable. When a placement has
 * a mobile unit configured, the 300x250 is served below the `md` breakpoint and
 * the 728x90 above it.
 */

/** Where an ad slot sits. One Adsterra unit (or a desktop/mobile pair) each. */
export type AdPlacementName =
  "home" | "anime" | "episodes" | "watch" | "watchSecondary";

/** One Adsterra unit: its key, the loader host that serves it, and its size. */
export interface AdUnit {
  key: string;
  /**
   * Adsterra hands out several loader hosts; only the one printed in the
   * unit's own GET CODE snippet fills. A different host answers 200 and even
   * builds the container, then leaves it empty, because the key is not
   * registered there — so the host travels with the key, overridable per unit
   * via the `key@host` env form.
   */
  host: string;
  width: number;
  height: number;
}

/** The unit(s) backing one placement. Either half may be absent. */
export interface AdPlacement {
  desktop: AdUnit | null;
  mobile: AdUnit | null;
}

/** The single key every slot shared before per-placement units existed. */
const LEGACY_KEY = "457046751eadca952094de44e01be6ec";

/** Loader host for units that don't carry their own in the env value. */
const DEFAULT_HOST = "https://www.highrevenueformat.com";

const DESKTOP_SIZE = { width: 728, height: 90 } as const;
const MOBILE_SIZE = { width: 300, height: 250 } as const;

/**
 * Env values are read through static `process.env.NEXT_PUBLIC_*` references
 * because Next inlines them at build time — a dynamic lookup would resolve to
 * `undefined` in the browser bundle.
 */
const ENV: Record<AdPlacementName, { desktop?: string; mobile?: string }> = {
  home: {
    desktop: process.env.NEXT_PUBLIC_ADSTERRA_HOME,
    mobile: process.env.NEXT_PUBLIC_ADSTERRA_HOME_MOBILE,
  },
  anime: {
    desktop: process.env.NEXT_PUBLIC_ADSTERRA_ANIME,
    mobile: process.env.NEXT_PUBLIC_ADSTERRA_ANIME_MOBILE,
  },
  episodes: {
    desktop: process.env.NEXT_PUBLIC_ADSTERRA_EPISODES,
    mobile: process.env.NEXT_PUBLIC_ADSTERRA_EPISODES_MOBILE,
  },
  watch: {
    desktop: process.env.NEXT_PUBLIC_ADSTERRA_WATCH,
    mobile: process.env.NEXT_PUBLIC_ADSTERRA_WATCH_MOBILE,
  },
  watchSecondary: {
    desktop: process.env.NEXT_PUBLIC_ADSTERRA_WATCH_SECONDARY,
    mobile: process.env.NEXT_PUBLIC_ADSTERRA_WATCH_SECONDARY_MOBILE,
  },
};

/** `"<key>"` or `"<key>@https://host"` → a unit of the given size. */
function parseUnit(
  value: string | undefined,
  size: { width: number; height: number },
): AdUnit | null {
  const raw = value?.trim();
  if (!raw) return null;

  const [key, host] = raw.split("@");
  const cleanKey = key?.trim();
  if (!cleanKey) return null;

  return {
    key: cleanKey,
    host: host?.trim() || DEFAULT_HOST,
    ...size,
  };
}

function resolve(name: AdPlacementName): AdPlacement {
  const env = ENV[name];
  const desktop = parseUnit(env.desktop, DESKTOP_SIZE);

  return {
    // The watch page's second slot is new, so it stays dark until it has a key
    // of its own: falling back to the legacy key would run the same unit twice
    // on one page and merge the two placements' numbers all over again.
    desktop:
      desktop ??
      (name === "watchSecondary"
        ? null
        : { key: LEGACY_KEY, host: DEFAULT_HOST, ...DESKTOP_SIZE }),
    mobile: parseUnit(env.mobile, MOBILE_SIZE),
  };
}

/**
 * Resolved once at module load: the env is fixed at build time, and a stable
 * object per placement keeps the loader effect's dependencies from churning.
 */
const PLACEMENTS: Record<AdPlacementName, AdPlacement> = {
  home: resolve("home"),
  anime: resolve("anime"),
  episodes: resolve("episodes"),
  watch: resolve("watch"),
  watchSecondary: resolve("watchSecondary"),
};

/** The unit(s) configured for one placement. */
export function adPlacement(name: AdPlacementName): AdPlacement {
  return PLACEMENTS[name];
}
