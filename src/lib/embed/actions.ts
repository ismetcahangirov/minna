"use server";

import {
  type AudioLang,
  type EmbedCandidate,
  resolveMegaplaySource,
} from "@/lib/embed/megaplay";

/**
 * Client-callable resolver for `EmbedPlayer`: probes MegaPlay server-side (the
 * only place that can read a cross-origin response body) and returns the
 * embed address to actually mount, or `null` if the episode isn't available
 * under either of MegaPlay's id mappings.
 */
export async function resolveEmbedSource(
  animeId: string,
  malId: number | null,
  episodeNumber: number,
  lang: AudioLang,
): Promise<EmbedCandidate | null> {
  return resolveMegaplaySource(animeId, malId, episodeNumber, lang);
}
