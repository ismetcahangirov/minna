/**
 * The canonical `{id}-{slug}` segment of every anime URL, as one shared record.
 *
 * ## Why a registry and not just `animeSlug(id, title)`
 *
 * The slug is derived from the anime's title, and the title depends on *which
 * source answered*. `sitemap.xml` enumerates the catalogue through
 * `advancedSearchAnime`, the detail page reads one record through
 * `fetchAnimeInfo`, and either call may have been served by AniList or by the
 * Kitsu standby (`@/lib/anime/provider`) depending on what was up at the time.
 * Kitsu calls episode 110277 "Attack on Titan Final Season" where AniList calls
 * it "Attack on Titan The Final Season", so the same anime could be advertised
 * in the sitemap at one URL and claim a different one in its own `<link
 * rel="canonical">` — the two strongest signals a page sends, contradicting
 * each other.
 *
 * Deriving the slug from a title therefore cannot be made consistent; the
 * source of truth has to be *shared*. So the first producer to resolve an id
 * writes the slug it derived, and from then on the sitemap, the page's
 * canonical tag and the proxy's redirect all read that one value. Which title
 * won is cosmetic; that all three agree is not.
 *
 * ## Stability
 *
 * A canonical URL that moves is worse than an imperfect one, so an entry is
 * written only when absent (`SET NX`) and its lifetime is refreshed on every
 * read (`GETEX`). An anime that keeps getting traffic keeps its URL
 * indefinitely; one nobody has asked for in {@link SLUG_TTL} re-derives, which
 * is the only way a title that gained an official English name later can ever
 * improve its slug.
 *
 * This module is deliberately free of `server-only` and of any server-only
 * import: `src/proxy.ts` reads it before a request is routed, and Next bundles
 * the proxy in a layer where `server-only` throws.
 */
import {
  animeEpisodesPageHref,
  animeHref,
  animeSlug,
  seasonSlug,
  watchHref,
  type SeasonSlugKind,
} from "@/lib/anime/href";
import { getRedis } from "@/lib/cache/redis-client";

/**
 * Bump to invalidate every stored slug at once — i.e. when {@link animeSlug},
 * {@link seasonSlug} or `slugifyTitle` changes shape, since existing entries
 * would then disagree with freshly derived ones. v2 added the season-chain
 * suffix (`-season-2`, `-movie-1`, …) `canonicalSeasonSlugs` claims; v3 fixed
 * it double-appending on titles that already spell the season out
 * ("…-special-1-special-1").
 */
const SLUG_CACHE_VERSION = "v3";

/** 30 days, refreshed on read. See "Stability" above. */
const SLUG_TTL = 60 * 60 * 24 * 30;

/** The Redis key holding one anime's canonical URL segment. */
export function animeSlugCacheKey(id: string): string {
  return `anime:slug:${SLUG_CACHE_VERSION}:${id}`;
}

/**
 * Reads a stored slug and refreshes its lifetime in a single round trip.
 *
 * `GETEX` needs Redis 6.2; a server older than that answers with an unknown-
 * command error, so it falls back to a plain `GET` (losing only the refresh).
 */
async function getRefreshing(key: string): Promise<string | null> {
  const redis = getRedis();
  if (!redis) return null;

  try {
    return await redis.getex(key, "EX", SLUG_TTL);
  } catch {
    try {
      return await redis.get(key);
    } catch (error) {
      console.error(
        "[anime] canonical slug read failed:",
        (error as Error).message,
      );
      return null;
    }
  }
}

/**
 * The canonical URL segment for one anime, or `null` when nothing has claimed
 * it yet (or Redis is unavailable).
 *
 * This is the proxy's whole dependency: a miss means "do not redirect", which
 * leaves the request behaving exactly as it did before this registry existed.
 */
export async function readCanonicalSlug(id: string): Promise<string | null> {
  const clean = id.trim();
  if (!clean) return null;
  return getRefreshing(animeSlugCacheKey(clean));
}

/**
 * The canonical segment for one anime, claiming it for `title` when no entry
 * exists yet. Returns the slug that is now canonical — the stored one on a hit,
 * the freshly derived one on a miss — so a caller never has to guess which won.
 *
 * Falls back to deriving from `title` when Redis is unavailable, so a cache
 * outage degrades to the pre-registry behaviour rather than breaking URLs.
 */
export async function canonicalSlug(
  id: string,
  title: string | null | undefined,
): Promise<string> {
  return resolveSlug(id, animeSlug(id, title));
}

/**
 * Reads the stored slug for `id`, claiming `candidate` when nothing holds it
 * yet. The shared read-then-claim step behind {@link canonicalSlug} (candidate
 * derived from a bare title) and {@link canonicalSeasonSlugs} (candidate
 * carries a season suffix), so both agree on what "already claimed" means.
 */
async function resolveSlug(id: string, candidate: string): Promise<string> {
  const stored = await readCanonicalSlug(id);
  if (stored) return stored;

  await claimSlug(id, candidate);
  return candidate;
}

/**
 * Claims/reads canonical slugs for every member of a resolved season chain at
 * once, each carrying its own `-{kind}-{index}` suffix ({@link seasonSlug}).
 *
 * Visiting any single page in a franchise is what gives its *siblings* a
 * distinguishable canonical URL this way, not only the page that was actually
 * opened — the whole chain is claimed together the first time any one
 * member's chain is resolved. Never overwrites an id claimed before this ran
 * (by this function, by {@link canonicalSlug}, or by the sitemap's
 * plain-title bulk claim) — the stability guarantee documented above applies
 * here exactly as it does everywhere else in this registry.
 */
export async function canonicalSeasonSlugs(
  seasons: ReadonlyArray<{
    id: string;
    title: string;
    kind: SeasonSlugKind;
    index: number;
  }>,
): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  await Promise.all(
    seasons.map(async (season) => {
      const candidate = seasonSlug(
        season.id,
        season.title,
        season.kind,
        season.index,
      );
      results.set(season.id, await resolveSlug(season.id, candidate));
    }),
  );
  return results;
}

/** Writes `slug` as the canonical segment for `id` unless one already exists. */
async function claimSlug(id: string, slug: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    await redis.set(animeSlugCacheKey(id), slug, "EX", SLUG_TTL, "NX");
  } catch (error) {
    console.error(
      "[anime] canonical slug write failed:",
      (error as Error).message,
    );
  }
}

/**
 * The bulk form, for `sitemap.xml`: resolves a whole catalogue enumeration in
 * one `MGET` plus one pipeline of writes for the ids nobody has claimed yet.
 * Doing it per entry would be ~1,800 sequential round trips on every crawl.
 *
 * @param entries id → the title to derive a slug from if the id is unclaimed.
 * @returns id → canonical segment, one per input entry.
 */
export async function canonicalSlugs(
  entries: ReadonlyArray<{ id: string; title: string | null | undefined }>,
): Promise<Map<string, string>> {
  const resolved = new Map<string, string>();
  if (entries.length === 0) return resolved;

  const derived = new Map(
    entries.map((entry) => [entry.id, animeSlug(entry.id, entry.title)]),
  );

  const redis = getRedis();
  if (!redis) return derived;

  const ids = [...derived.keys()];

  let stored: (string | null)[] = [];
  try {
    stored = await redis.mget(ids.map(animeSlugCacheKey));
  } catch (error) {
    console.error(
      "[anime] canonical slug bulk read failed:",
      (error as Error).message,
    );
    return derived;
  }

  // One pipeline for both halves: claim the ids nobody holds, and refresh the
  // lifetime of the ones already claimed so a title the sitemap keeps listing
  // never expires out from under the index.
  const pipeline = redis.pipeline();
  ids.forEach((id, index) => {
    const slug = stored[index];
    const key = animeSlugCacheKey(id);

    if (slug) {
      resolved.set(id, slug);
      pipeline.expire(key, SLUG_TTL);
    } else {
      const claim = derived.get(id)!;
      resolved.set(id, claim);
      pipeline.set(key, claim, "EX", SLUG_TTL, "NX");
    }
  });

  try {
    await pipeline.exec();
  } catch (error) {
    // A missed claim only costs a re-derive next crawl; never fail a sitemap.
    console.error(
      "[anime] canonical slug bulk write failed:",
      (error as Error).message,
    );
  }

  return resolved;
}

/**
 * The canonical `/anime/{id}-{slug}` path — what the page's `<link
 * rel="canonical">` must claim and what the proxy redirects to.
 *
 * Every one of these takes the same `(id, title)` a plain `@/lib/anime/href`
 * builder takes, so a call site only changes shape by gaining an `await`. The
 * title is what the id is *claimed* for when nothing holds it yet; once it is
 * claimed the title is ignored, which is exactly the point.
 */
export async function canonicalAnimeHref(
  id: string,
  title: string | null | undefined,
): Promise<string> {
  return animeHref(await canonicalSlug(id, title));
}

/** The canonical `/anime/{id}-{slug}/episodes` path, page and filter included. */
export async function canonicalAnimeEpisodesHref(
  id: string,
  title: string | null | undefined,
  options: { page?: number; descending?: boolean; query?: string | null } = {},
): Promise<string> {
  return animeEpisodesPageHref(await canonicalSlug(id, title), null, options);
}

/** The canonical `/watch/{id}-{slug}/episode-{n}` path. */
export async function canonicalWatchHref(
  id: string,
  episodeNumber: number,
  title: string | null | undefined,
): Promise<string> {
  return watchHref(await canonicalSlug(id, title), episodeNumber);
}
