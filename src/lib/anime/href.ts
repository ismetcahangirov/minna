/**
 * Canonical anime URL helpers (SEO).
 *
 * Anime detail pages live at `/anime/{id}-{slug}` (e.g.
 * `/anime/140960-jujutsu-kaisen`). The leading digits are the AniList id used
 * for every lookup (metadata fetch, watch route, DB rows); the trailing slug is
 * purely for search engines and humans and is ignored when resolving the id.
 * Bare `/anime/{id}` still resolves — the detail page 301-redirects it to the
 * canonical slug form.
 */

/**
 * Turns an anime title into a URL-safe slug: lowercases, strips diacritics and
 * any non `[a-z0-9]` run into single dashes. Returns `""` for titles with no
 * latin/digit characters (e.g. CJK-only), in which case the URL is just the id.
 */
export function slugifyTitle(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // combining diacritical marks
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Builds the `{id}-{slug}` path segment shared by the anime detail, episodes
 * and watch routes (e.g. `140960-jujutsu-kaisen`). Falls back to the bare id
 * when the title yields an empty slug so the id always resolves.
 */
export function animeSlug(id: string, title?: string | null): string {
  const slug = title ? slugifyTitle(title) : "";
  return slug ? `${id}-${slug}` : id;
}

/**
 * Builds the canonical `/anime/{id}-{slug}` path. Falls back to `/anime/{id}`
 * when the title yields an empty slug so the id always resolves.
 */
export function animeHref(id: string, title?: string | null): string {
  return `/anime/${animeSlug(id, title)}`;
}

/**
 * Builds the canonical watch path,
 * `/watch/{id}-{anime-slug}/episode-{number}` (e.g.
 * `/watch/140960-jujutsu-kaisen/episode-5`), so the player URL is human- and
 * search-engine-readable: the first segment carries the anime name, the second
 * the word "episode" and its number. Only the leading digits of each segment
 * are used to resolve the anime id and episode number; the slug text is ignored.
 */
export function watchHref(
  id: string,
  episodeNumber: number,
  title?: string | null,
): string {
  return `/watch/${animeSlug(id, title)}/episode-${episodeNumber}`;
}

/**
 * Extracts the episode number from a watch route's `[episodeId]` segment.
 * Accepts the canonical `episode-{n}` slug (including a leading anime slug, e.g.
 * `jujutsu-kaisen-episode-5`) and a bare number (`5`). Returns null when no
 * trailing number is present, so the caller can fall back to matching a legacy
 * opaque episode id.
 */
export function parseEpisodeNumber(param: string): number | null {
  const match = /(?:^|episode-)(\d+(?:\.\d+)?)$/.exec(param.trim());
  return match ? Number(match[1]) : null;
}

/**
 * Builds the canonical episodes-list path for an anime,
 * `/anime/{id}-{slug}/episodes`. This is where a season card and the detail
 * page's watch button lead — the full episode grid with infinite scroll.
 */
export function animeEpisodesHref(id: string, title?: string | null): string {
  return `${animeHref(id, title)}/episodes`;
}

/**
 * Extracts the AniList id from an `/anime/[id]` route param that may be a bare
 * id (`"140960"`) or the canonical slug form (`"140960-jujutsu-kaisen"`).
 * Returns the raw param when it has no leading digits so an invalid URL falls
 * through to a 404 rather than silently resolving something else.
 */
export function parseAnimeParam(param: string): string {
  const match = /^(\d+)/.exec(param.trim());
  return match ? match[1] : param.trim();
}
