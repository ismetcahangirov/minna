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
 * Builds the canonical `/anime/{id}-{slug}` path. Falls back to `/anime/{id}`
 * when the title yields an empty slug so the id always resolves.
 */
export function animeHref(id: string, title?: string | null): string {
  const slug = title ? slugifyTitle(title) : "";
  return slug ? `/anime/${id}-${slug}` : `/anime/${id}`;
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
