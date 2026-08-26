/**
 * The shape of the three slugged anime URLs, expressed without any data access
 * so the proxy can use it (`src/proxy.ts`).
 *
 * Every one of these routes resolves its anime from the *leading digits* of a
 * path segment and ignores the rest, which is what makes `/anime/21`,
 * `/anime/21-one-piece` and `/anime/21-anything-at-all` render the same page.
 * Consolidating them onto one URL needs two halves: recognising the route and
 * the id inside it (here), and looking up the id's canonical slug
 * (`@/lib/anime/canonical-slug`). Keeping the first half free of imports beyond
 * the pure href helpers is what lets both the proxy and the render path share
 * it.
 */
import {
  animeEpisodesHref,
  animeHref,
  parseAnimeParam,
  parseEpisodeNumber,
  watchHref,
} from "@/lib/anime/href";

/** Which of the three slugged routes a pathname is, once matched. */
export type AnimeRouteKind = "detail" | "episodes" | "watch";

/**
 * A recognised anime URL, reduced to what deciding its canonical form needs:
 * the route shape, the AniList id it addresses, and — for a watch URL — the
 * episode number it resolved to.
 */
export interface AnimeRouteMatch {
  kind: AnimeRouteKind;
  /** AniList id, digits only. */
  id: string;
  /** The `[id]` / `[animeId]` segment exactly as it was requested. */
  segment: string;
  /** Episode number, for `kind: "watch"` only. */
  episodeNumber?: number;
}

/** An AniList id is always a plain integer; anything else cannot be resolved. */
function isAnimeId(value: string): boolean {
  return /^\d+$/.test(value);
}

/**
 * Recognises `/anime/{id}`, `/anime/{id}/episodes` and
 * `/watch/{animeId}/{episodeId}` in an **unprefixed** pathname (strip the
 * locale first — see `splitLocalePath`).
 *
 * Returns `null` for anything else, and for a URL this layer cannot canonicalise
 * on its own: a segment with no leading id (which the page turns into a 404),
 * or a legacy opaque episode id, whose number is only knowable from the anime's
 * episode list. Those fall through to the page, which still consolidates them
 * the way it always has.
 */
export function matchAnimeRoute(pathname: string): AnimeRouteMatch | null {
  const segments = pathname.split("/").filter(Boolean);

  if (
    segments[0] === "anime" &&
    (segments.length === 2 || segments.length === 3)
  ) {
    if (segments.length === 3 && segments[2] !== "episodes") return null;

    const segment = segments[1];
    const id = parseAnimeParam(segment);
    if (!isAnimeId(id)) return null;

    return { kind: segments.length === 3 ? "episodes" : "detail", id, segment };
  }

  if (segments[0] === "watch" && segments.length === 3) {
    const segment = segments[1];
    const id = parseAnimeParam(segment);
    if (!isAnimeId(id)) return null;

    const episodeNumber = parseEpisodeNumber(segments[2]);
    if (episodeNumber === null) return null;

    return { kind: "watch", id, segment, episodeNumber };
  }

  return null;
}

/**
 * The canonical unprefixed path for a matched route, given the anime's
 * canonical `{id}-{slug}` segment.
 *
 * The slug is passed in rather than derived from a title because the canonical
 * one is whatever the registry holds — see `@/lib/anime/canonical-slug` for why
 * a title is not enough.
 */
export function canonicalRoutePath(
  match: AnimeRouteMatch,
  slug: string,
): string {
  // The href builders take (id, title) and slugify; the slug is already final
  // here, so they are fed the id and no title and the segment is substituted.
  switch (match.kind) {
    case "detail":
      return animeHref(slug);
    case "episodes":
      return animeEpisodesHref(slug);
    case "watch":
      return watchHref(slug, match.episodeNumber ?? 1);
  }
}
