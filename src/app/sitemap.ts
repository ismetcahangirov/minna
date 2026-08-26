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
import { listBlogTagSitemapEntries } from "@/lib/blog/tags";
import { cacheKey, getOrSet } from "@/lib/cache";
import { absoluteUrl } from "@/lib/seo/site";

/**
 * Built per request rather than prerendered at build time.
 *
 * The catalog sources this enumerates are uncacheable by design: Kitsu — the
 * standby the whole catalog falls back to whenever AniList disables itself —
 * fetches with `no-store` so a stale response cannot outlive its Redis entry.
 * Prerendering a route that touches such a fetch is a build error, so whenever
 * AniList happened to be down while a deployment built, the export failed and
 * took the whole deployment with it. Which source answers is not something a
 * deploy should depend on, so the route is dynamic and the enumeration itself
 * is cached for an hour (see {@link sitemapEntries}) — a crawler hit costs one
 * Redis read, and at most one full walk an hour.
 *
 * Anime routes come from the popular feed plus every favorited/watched title
 * (see {@link listAnimeSitemapEntries}); AniList has no "list all" endpoint, so
 * the popular head is a deliberate, logged bound. Auth-only and admin routes
 * are excluded by design — see {@link ./robots}.
 */
export const dynamic = "force-dynamic";

/** How long one enumeration of the catalog is reused for. */
const SITEMAP_TTL = 3600;

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
 * The three enumerations behind the sitemap, cached together for
 * {@link SITEMAP_TTL} so a burst of crawler hits costs one walk, not one each.
 */
async function sitemapEntries() {
  return getOrSet(
    cacheKey("sitemap", "entries", "v3"),
    SITEMAP_TTL,
    async () => {
      const [anime, posts, episodes, tags] = await Promise.all([
        listAnimeSitemapEntries(),
        listBlogSitemapEntries(),
        listEpisodeSitemapEntries(),
        listBlogTagSitemapEntries(),
      ]);
      return { anime, posts, episodes, tags };
    },
  );
}

/**
 * `sitemap.xml` (PERF-01): the static public pages, every published blog post
 * and every tag archive that has one. Degrades to just the static routes if the
 * blog queries fail.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const { anime, posts, episodes, tags } = await sitemapEntries();

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

  // Every language version of an article, keyed by its tag, so each sitemap
  // entry can carry the same reciprocal set the pages declare. Google reads
  // sitemap alternates and page `hreflang` as one claim and expects them to
  // agree, so both are built from the same rows.
  const versionsByGroup = new Map<string, Record<string, string>>();
  for (const post of posts) {
    const group = versionsByGroup.get(post.translationGroupId) ?? {};
    group[post.language] = absoluteUrl(`/blogs/${post.slug}`);
    versionsByGroup.set(post.translationGroupId, group);
  }

  const blogEntries: MetadataRoute.Sitemap = posts.map((post) => {
    const versions = versionsByGroup.get(post.translationGroupId) ?? {};
    // An untranslated post has nothing to alternate with; listing itself alone
    // claims a language choice the reader does not have.
    const languages = Object.keys(versions).length > 1 ? versions : undefined;

    return {
      url: absoluteUrl(`/blogs/${post.slug}`),
      lastModified: post.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
      ...(languages ? { alternates: { languages } } : {}),
    };
  });

  // Tag archives are hubs, not leaves: a well-stocked one is a better entry
  // point than any single post under it, so its priority tracks how much it
  // covers rather than sitting at a flat default.
  const blogTagEntries: MetadataRoute.Sitemap = tags.map((tag) => ({
    url: absoluteUrl(`/blogs/tag/${tag.slug}`),
    lastModified: tag.updatedAt,
    changeFrequency: "weekly",
    priority: tag.postCount >= 5 ? 0.6 : 0.4,
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
    ...blogTagEntries,
    ...watchEntries,
  ];
}
