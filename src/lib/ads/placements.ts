/**
 * Ad-unit registry (HOME-08).
 *
 * Every slot in the app used to share ONE Adsterra key, which made the
 * network's dashboard useless for deciding where ads are worth carrying: home,
 * detail, episodes and watch impressions all landed in a single row, so
 * per-placement eCPM was unknowable. Each placement now reads its own unit from
 * the environment.
 *
 * Adsterra only allows ONE unit per format+size per website, so units alone
 * cannot separate four placements of the same size. A second network can:
 * each reports in its own dashboard, so pointing one placement at HilltopAds
 * both compares the two networks head-to-head and gives that placement numbers
 * of its own.
 *
 * Sizes are fixed per unit, so a slot that should also serve phones needs a
 * SECOND unit at a phone-friendly size: a 728x90 scaled into a 360px viewport
 * is ~44px tall and effectively unviewable. When a placement has a mobile unit
 * configured, the 300x250 is served below the `md` breakpoint and the 728x90
 * above it.
 */

/** Where an ad slot sits. One unit (or a desktop/mobile pair) each. */
export type AdPlacementName =
  "home" | "anime" | "episodes" | "watch" | "watchSecondary";

/**
 * An Adsterra unit. Its loader host matters: Adsterra hands out several, and
 * only the one printed in the unit's own GET CODE snippet fills — a different
 * host answers 200 and even builds the container, then leaves it empty,
 * because the key is not registered there.
 */
export interface AdsterraUnit {
  network: "adsterra";
  key: string;
  host: string;
  width: number;
  height: number;
}

/**
 * A HilltopAds unit. Its whole loader URL is the unit identity (the token sits
 * in the path), and the domain rotates, which is exactly why it lives in the
 * environment rather than in code.
 */
export interface HilltopUnit {
  network: "hilltopads";
  src: string;
  width: number;
  height: number;
}

export type AdUnit = AdsterraUnit | HilltopUnit;

/** The unit(s) backing one placement. Either half may be absent. */
export interface AdPlacement {
  desktop: AdUnit | null;
  mobile: AdUnit | null;
  /**
   * Stand-in for {@link desktop} when that unit renders nothing — a network
   * that has no ad to serve leaves the reserved box empty, which reads as a
   * hole in the page rather than as an absent ad. Same size as `desktop`, and
   * only ever mounted after it has had its chance, so the primary unit keeps
   * every impression it can actually fill.
   */
  desktopFallback: AdUnit | null;
}

/** The single Adsterra key every slot shared before per-placement units existed. */
const LEGACY_KEY = "457046751eadca952094de44e01be6ec";

/** Loader host for Adsterra units that don't carry their own in the env value. */
const DEFAULT_HOST = "https://www.highrevenueformat.com";

/** Marks an env value as a HilltopAds loader URL rather than an Adsterra key. */
const HILLTOP_PREFIX = "hilltop:";

const DESKTOP_SIZE = { width: 728, height: 90 } as const;
const MOBILE_SIZE = { width: 300, height: 250 } as const;

/**
 * The anime detail page's desktop unit, pinned here rather than read from the
 * environment like the others.
 *
 * It is a HilltopAds leaderboard, replacing the Adsterra unit this slot used to
 * share with every other desktop slot on the site. Pinning it makes swapping it
 * a reviewable change with a deploy behind it, rather than something only
 * whoever holds the Vercel project's environment can do. `NEXT_PUBLIC_AD_ANIME`
 * is therefore no longer read — leaving it wired would let a stale value
 * silently win over this.
 */
const ANIME_DESKTOP_UNIT: HilltopUnit = {
  network: "hilltopads",
  src: "https://relieved-understanding.com/bvXPVCsjd.GglZ0kY-W/cr/TePmB9OuHZ/UtlXkuPtTpcyzqN/jZc/zPMgjykbtSN/z/MU2iNDztMfzLMXwN",
  ...DESKTOP_SIZE,
};

/** The shared Adsterra leaderboard, as a unit. */
const LEGACY_DESKTOP_UNIT: AdsterraUnit = {
  network: "adsterra",
  key: LEGACY_KEY,
  host: DEFAULT_HOST,
  ...DESKTOP_SIZE,
};

/**
 * Env values are read through static `process.env.NEXT_PUBLIC_*` references
 * because Next inlines them at build time — a dynamic lookup would resolve to
 * `undefined` in the browser bundle.
 */
const ENV: Record<AdPlacementName, { desktop?: string; mobile?: string }> = {
  home: {
    desktop: process.env.NEXT_PUBLIC_AD_HOME,
    mobile: process.env.NEXT_PUBLIC_AD_HOME_MOBILE,
  },
  // Desktop is pinned — see ANIME_DESKTOP_UNIT.
  anime: {
    mobile: process.env.NEXT_PUBLIC_AD_ANIME_MOBILE,
  },
  episodes: {
    desktop: process.env.NEXT_PUBLIC_AD_EPISODES,
    mobile: process.env.NEXT_PUBLIC_AD_EPISODES_MOBILE,
  },
  watch: {
    desktop: process.env.NEXT_PUBLIC_AD_WATCH,
    mobile: process.env.NEXT_PUBLIC_AD_WATCH_MOBILE,
  },
  watchSecondary: {
    desktop: process.env.NEXT_PUBLIC_AD_WATCH_SECONDARY,
    mobile: process.env.NEXT_PUBLIC_AD_WATCH_SECONDARY_MOBILE,
  },
};

/**
 * One env value → one unit. Two accepted forms:
 *
 * - `"<key>"` or `"<key>@https://loader-host"` — an Adsterra unit.
 * - `"hilltop:<loader url>"` — a HilltopAds unit.
 */
function parseUnit(
  value: string | undefined,
  size: { width: number; height: number },
): AdUnit | null {
  const raw = value?.trim();
  if (!raw) return null;

  if (raw.startsWith(HILLTOP_PREFIX)) {
    const src = raw.slice(HILLTOP_PREFIX.length).trim();
    if (!src) return null;
    return { network: "hilltopads", src, ...size };
  }

  const [key, host] = raw.split("@");
  const cleanKey = key?.trim();
  if (!cleanKey) return null;

  return {
    network: "adsterra",
    key: cleanKey,
    host: host?.trim() || DEFAULT_HOST,
    ...size,
  };
}

function resolve(name: AdPlacementName): AdPlacement {
  const env = ENV[name];
  if (name === "anime") {
    return {
      desktop: ANIME_DESKTOP_UNIT,
      mobile: parseUnit(env.mobile, MOBILE_SIZE),
      // The only placement served by a network that is not also the site's
      // default: if it has nothing to serve, the slot would sit empty where an
      // Adsterra leaderboard used to be. The other placements need no
      // stand-in — they already are the default network.
      desktopFallback: LEGACY_DESKTOP_UNIT,
    };
  }

  const desktop = parseUnit(env.desktop, DESKTOP_SIZE);

  return {
    // The watch page's second slot is new, so it stays dark until it has a unit
    // of its own: falling back to the legacy key would run the same unit twice
    // on one page and merge the two placements' numbers all over again.
    desktop:
      desktop ?? (name === "watchSecondary" ? null : LEGACY_DESKTOP_UNIT),
    mobile: parseUnit(env.mobile, MOBILE_SIZE),
    desktopFallback: null,
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
