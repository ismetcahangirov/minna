import type { MetadataRoute } from "next";

import {
  animeEpisodesPageHref,
  animeHref,
  episodesPageCount,
  watchHref,
} from "@/lib/anime/href";
import {
  listAnimeSitemapEntries,
  listEpisodeSitemapEntries,
} from "@/lib/anime/sitemap";
import { listBlogSitemapEntries } from "@/lib/blog/queries";
import { absoluteUrl } from "@/lib/seo/site";

/**
 * Refresh the sitemap hourly. Anime detail routes are enumerated from the
 * popular feed plus every favorited/watched title (see
 * {@link listAnimeSitemapEntries}); AniList has no "list all" endpoint, so the
 * popular head is a deliberate, logged bound. Auth-only and admin routes are
 * excluded by design — see {@link ./robots}.
 */
export const revalidate = 3600;

/** The publicly crawlable static routes and their crawl hints. */
const STATIC_ROUTES: ReadonlyArray<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}> = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/popular", changeFrequency: "daily", priority: 0.9 },
  { path: "/blogs", changeFrequency: "weekly", priority: 0.7 },
  { path: "/search", changeFrequency: "monthly", priority: 0.5 },
];

/**
 * `sitemap.xml` (PERF-01): the static public pages plus every published blog
 * post. Degrades to just the static routes if the blog query fails.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const [anime, posts, episodes] = await Promise.all([
    listAnimeSitemapEntries(),
    listBlogSitemapEntries(),
    listEpisodeSitemapEntries(),
  ]);

  const animeEntries: MetadataRoute.Sitemap = anime.map((entry) => ({
    url: absoluteUrl(animeHref(entry.id, entry.title)),
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  // The episodes list of a long series spans several `?page=` URLs — each is a
  // distinct set of episodes, so each is listed. Titles whose episode count is
  // unknown contribute their first page only.
  const episodeListEntries: MetadataRoute.Sitemap = anime.flatMap((entry) => {
    const pages = entry.episodes ? episodesPageCount(entry.episodes) : 1;
    return Array.from({ length: pages }, (_, index) => ({
      url: absoluteUrl(
        animeEpisodesPageHref(entry.id, entry.title, { page: index + 1 }),
      ),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: index === 0 ? 0.7 : 0.5,
    }));
  });

  const blogEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: absoluteUrl(`/blogs/${post.slug}`),
    lastModified: post.updatedAt,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const watchEntries: MetadataRoute.Sitemap = episodes.map((ep) => ({
    url: absoluteUrl(watchHref(ep.animeId, ep.episodeNumber, ep.animeTitle)),
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [
    ...staticEntries,
    ...animeEntries,
    ...episodeListEntries,
    ...blogEntries,
    ...watchEntries,
  ];
}
