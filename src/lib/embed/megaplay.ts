import "server-only";

import { CACHE_TTL, cacheKey, getOrSet } from "@/lib/cache";
import { getSiteUrl } from "@/lib/seo/site";

const EMBED_ORIGIN = "https://megaplay.buzz";

/** Marker MegaPlay's own client-rendered 404 page always contains. */
const ERROR_MARKER = "Error - MegaPlay";

const PROBE_TIMEOUT_MS = 6_000;
const PROBE_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

/** Cache key version — bump if the probe logic or its result shape changes. */
const RESOLVE_CACHE_VERSION = "v1";

export type AudioLang = "sub" | "dub";
export type EmbedScheme = "ani" | "mal";

export interface EmbedCandidate {
  scheme: EmbedScheme;
  value: string;
}

interface Resolution {
  candidate: EmbedCandidate | null;
}

/**
 * Checks whether one MegaPlay embed address actually serves an episode.
 *
 * MegaPlay's error page for a missing title is a fully valid document (200,
 * real HTML) — a cross-origin `<iframe>` can't tell it apart from a working
 * player via `onLoad`, so detection has to happen here, server-side, where the
 * response body can be read. `Referer` must point at a real site origin —
 * MegaPlay serves the same error page to every request without one.
 */
async function candidateWorks(
  scheme: EmbedScheme,
  value: string,
  episodeNumber: number,
  lang: AudioLang,
): Promise<boolean> {
  const url = `${EMBED_ORIGIN}/stream/${scheme}/${encodeURIComponent(value)}/${episodeNumber}/${lang}`;

  try {
    const res = await fetch(url, {
      headers: {
        Referer: `${getSiteUrl()}/`,
        "User-Agent": PROBE_USER_AGENT,
      },
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    if (!res.ok) return false;
    const body = await res.text();
    return !body.includes(ERROR_MARKER);
  } catch (error) {
    console.warn(
      `[embed] megaplay probe failed for ${scheme}/${value}/${episodeNumber}/${lang}:`,
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
}

/**
 * Resolves which MegaPlay embed address (AniList id or MyAnimeList id) is
 * actually playable for an episode, or `null` if neither is.
 *
 * MegaPlay maps the same catalog under two independently-synced ids, and a
 * title missing from one often still resolves via the other (see
 * `EmbedPlayer`'s docs). Read-through cached per (anime, mal, episode, lang)
 * so repeat views of the same episode don't re-probe MegaPlay.
 */
export async function resolveMegaplaySource(
  animeId: string,
  malId: number | null,
  episodeNumber: number,
  lang: AudioLang,
): Promise<EmbedCandidate | null> {
  const key = cacheKey(
    "embed",
    "megaplay",
    RESOLVE_CACHE_VERSION,
    animeId,
    malId ?? "none",
    episodeNumber,
    lang,
  );

  const { candidate } = await getOrSet<Resolution>(
    key,
    CACHE_TTL.medium,
    async () => {
      if (await candidateWorks("ani", animeId, episodeNumber, lang)) {
        return { candidate: { scheme: "ani", value: animeId } };
      }
      if (
        malId != null &&
        (await candidateWorks("mal", String(malId), episodeNumber, lang))
      ) {
        return { candidate: { scheme: "mal", value: String(malId) } };
      }
      return { candidate: null };
    },
  );

  return candidate;
}
