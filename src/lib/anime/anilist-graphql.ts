import "server-only";

import type { ConsumetInfoResponse } from "@/lib/anime/types";

/**
 * Direct AniList GraphQL access for the season switcher.
 *
 * The season walk needs each neighbour's title, format, episode count and its
 * own relations. Consumet's `fetchAnilistInfoById` is unusable for this: it
 * couples metadata with a streaming-provider episode mapping that is IP-blocked
 * on Vercel and throws (aborting the whole chain). AniList's GraphQL API is
 * pure metadata — reliable everywhere — so neighbours are fetched straight from
 * it. Shaped as a {@link ConsumetInfoResponse} so the existing `toAnimeDetail`
 * narrower (and `toRelations`) applies unchanged.
 */

const ANILIST_GRAPHQL = "https://graphql.anilist.co";

const SEASON_NODE_QUERY = `
query ($id: Int) {
  Media(id: $id, type: ANIME) {
    id
    title { romaji english userPreferred native }
    format
    episodes
    nextAiringEpisode { episode }
    coverImage { large }
    bannerImage
    relations {
      edges {
        relationType
        node {
          id
          type
          format
          title { romaji english userPreferred native }
          coverImage { large }
        }
      }
    }
  }
}`;

interface AniListTitle {
  romaji?: string | null;
  english?: string | null;
  userPreferred?: string | null;
  native?: string | null;
}

interface AniListRelationNode {
  id?: number | null;
  type?: string | null;
  format?: string | null;
  title?: AniListTitle | null;
  coverImage?: { large?: string | null } | null;
}

interface AniListMedia {
  id?: number | null;
  title?: AniListTitle | null;
  format?: string | null;
  episodes?: number | null;
  nextAiringEpisode?: { episode?: number | null } | null;
  coverImage?: { large?: string | null } | null;
  bannerImage?: string | null;
  relations?: {
    edges?: Array<{
      relationType?: string | null;
      node?: AniListRelationNode | null;
    }> | null;
  } | null;
}

/**
 * Fetches one anime's season-relevant metadata + relations from AniList, or
 * `null` on any failure (bad id, non-200, rate limit, missing media) so a
 * single hiccup ends the chain gracefully rather than throwing.
 */
export async function fetchAniListSeasonNode(
  id: string,
): Promise<ConsumetInfoResponse | null> {
  const numeric = Number.parseInt(id, 10);
  if (!Number.isFinite(numeric)) return null;

  let media: AniListMedia | null;
  try {
    const res = await fetch(ANILIST_GRAPHQL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        query: SEASON_NODE_QUERY,
        variables: { id: numeric },
      }),
      // AniList metadata is near-static — let the platform cache the response
      // so repeated season walks don't re-hit the API.
      next: { revalidate: 60 * 60 * 24 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: { Media?: AniListMedia } };
    media = json?.data?.Media ?? null;
  } catch {
    return null;
  }
  if (!media || media.id === undefined || media.id === null) return null;

  const airing = media.nextAiringEpisode?.episode;
  const currentEpisode =
    typeof airing === "number" && airing > 1 ? airing - 1 : null;

  return {
    id: media.id,
    title: media.title ?? null,
    type: media.format ?? null,
    totalEpisodes: typeof media.episodes === "number" ? media.episodes : null,
    currentEpisode,
    image: media.coverImage?.large ?? null,
    cover: media.bannerImage ?? null,
    relations: Array.isArray(media.relations?.edges)
      ? media.relations.edges.map((edge) => ({
          id: edge?.node?.id ?? null,
          title: edge?.node?.title ?? null,
          type: edge?.node?.format ?? edge?.node?.type ?? null,
          image: edge?.node?.coverImage?.large ?? null,
          relationType: edge?.relationType ?? null,
        }))
      : null,
  };
}
