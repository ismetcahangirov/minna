import type { MetadataRoute } from "next";

import { canonicalSlugs } from "@/lib/anime/canonical-slug";
import {
  animeEpisodesPageHref,
  animeHref,
  animeSlug,
  episodesPageCount,
  watchHref,
} from "@/lib/anime/href";
import {
  listAnimeSitemapEntries,
  listEpisodeSitemapEntries,
} from "@/lib/anime/sitemap";
import { listBlogSitemapEntries } from "@/lib/blog/queries";
import { listBlogTagSitemapEntries } from "@/lib/blog/tags";
import { locales } from "@/i18n/config";
import { blogPostHref } from "@/lib/blog/href";
import { cacheKey, getOrSet } from "@/lib/cache";
import { pickDefaultVersion } from "@/lib/seo/hreflang";
import { localeVersions } from "@/lib/seo/locale-alternates";
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

/** Google refuses a sitemap with more URLs than this. */
const SITEMAP_URL_LIMIT = 50_000;

/**
 * One entry per locale for a page that exists in all three (I18N-05).
 *
 * Every entry carries the same reciprocal alternates set, because a sitemap
 * alternates block and a page's `hreflang` are read as one claim: listing only
 * the English URL — which is what this file used to do — left the Turkish and
 * Russian versions with no way into the index at all.
 *
 * `x-default` comes from the shared {@link pickDefaultVersion}, the same
 * function the pages use, so the two can never name different defaults.
 *
 * @param path The unprefixed path, e.g. `/popular`.
 */
function perLocale(
  path: string,
  entry: Omit<MetadataRoute.Sitemap[number], "url" | "alternates">,
): MetadataRoute.Sitemap {
  const versions = localeVersions(path);
  const absolute = Object.fromEntries(
    Object.entries(versions).map(([tag, href]) => [tag, absoluteUrl(href)]),
  );
  const languages = { ...absolute, "x-default": pickDefaultVersion(absolute) };

  return locales.map((locale) => ({
    ...entry,
    url: absoluteUrl(versions[locale]),
    alternates: { languages },
  }));
}

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
    cacheKey("sitemap", "entries", "v5"),
    SITEMAP_TTL,
    async () => {
      const [anime, posts, episodes, tags] = await Promise.all([
        listAnimeSitemapEntries(),
        listBlogSitemapEntries(),
        listEpisodeSitemapEntries(),
        listBlogTagSitemapEntries(),
      ]);

      // The URL segment comes from the canonical slug registry, not from the
      // title this enumeration happens to hold — the catalogue feed and the
      // detail record disagree about titles often enough (see
      // `@/lib/anime/canonical-slug`) that a sitemap built from the feed's own
      // title listed URLs the pages then disowned, and which the proxy now
      // redirects. Both enumerations resolve in one registry read.
      const slugs = await canonicalSlugs([
        ...anime.map((entry) => ({ id: entry.id, title: entry.title })),
        ...episodes.map((entry) => ({
          id: entry.animeId,
          title: entry.animeTitle,
        })),
      ]);

      return {
        anime: anime.map((entry) => ({
          ...entry,
          slug: slugs.get(entry.id) ?? animeSlug(entry.id, entry.title),
        })),
        episodes: episodes.map((entry) => ({
          ...entry,
          slug:
            slugs.get(entry.animeId) ??
            animeSlug(entry.animeId, entry.animeTitle),
        })),
        posts,
        tags,
      };
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

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.flatMap((route) =>
    perLocale(route.path, {
      lastModified: now,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    }),
  );

  const { anime, posts, episodes, tags } = await sitemapEntries();

  // `entry.slug` is already the final `{id}-{slug}` segment, so the href
  // builders below take it in place of the id and are given no title to
  // slugify — that decision was made once, in the registry.
  const animeEntries: MetadataRoute.Sitemap = anime.flatMap((entry) =>
    perLocale(animeHref(entry.slug), {
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    }),
  );

  // The episodes list of a long series spans several `?page=` URLs — each is a
  // distinct set of episodes, so each is listed. Titles whose episode count is
  // unknown contribute their first page only.
  const episodeListEntries: MetadataRoute.Sitemap = anime.flatMap((entry) => {
    const pages = entry.episodes ? episodesPageCount(entry.episodes) : 1;
    return Array.from({ length: pages }, (_, index) =>
      perLocale(animeEpisodesPageHref(entry.slug, null, { page: index + 1 }), {
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: index === 0 ? 0.7 : 0.5,
      }),
    ).flat();
  });

  // Every language version of an article, keyed by its tag, so each sitemap
  // entry can carry the same reciprocal set the pages declare. Google reads
  // sitemap alternates and page `hreflang` as one claim and expects them to
  // agree, so both are built from the same rows.
  const versionsByGroup = new Map<string, Record<string, string>>();
  for (const post of posts) {
    const group = versionsByGroup.get(post.translationGroupId) ?? {};
    group[post.language] = absoluteUrl(blogPostHref(post));
    versionsByGroup.set(post.translationGroupId, group);
  }

  const blogEntries: MetadataRoute.Sitemap = posts.map((post) => {
    const versions = versionsByGroup.get(post.translationGroupId) ?? {};
    // An untranslated post has nothing to alternate with; listing itself alone
    // claims a language choice the reader does not have.
    const languages =
      Object.keys(versions).length > 1
        ? { ...versions, "x-default": pickDefaultVersion(versions) }
        : undefined;

    return {
      // A post has one URL — its slug under its own language's prefix — so
      // unlike a site page it contributes one entry, not three (I18N-07).
      url: absoluteUrl(blogPostHref(post)),
      lastModified: post.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
      ...(languages ? { alternates: { languages } } : {}),
    };
  });

  // Tag archives are hubs, not leaves: a well-stocked one is a better entry
  // point than any single post under it, so its priority tracks how much it
  // covers rather than sitting at a flat default.
  const blogTagEntries: MetadataRoute.Sitemap = tags.flatMap((tag) =>
    perLocale(`/blogs/tag/${tag.slug}`, {
      lastModified: tag.updatedAt,
      changeFrequency: "weekly",
      priority: tag.postCount >= 5 ? 0.6 : 0.4,
    }),
  );

  const watchEntries: MetadataRoute.Sitemap = episodes.flatMap((ep) =>
    perLocale(watchHref(ep.slug, ep.episodeNumber), {
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }),
  );

  const all = [
    ...staticEntries,
    ...animeEntries,
    ...episodeListEntries,
    ...blogEntries,
    ...blogTagEntries,
    ...watchEntries,
  ];

  // Three locales means roughly three times the URLs. Nothing here truncates,
  // but crossing the limit means Google rejects the file wholesale rather than
  // taking the first 50,000 — so say so out loud rather than discovering it in
  // Search Console. The fix when it happens is a sitemap index, not a cap.
  if (all.length > SITEMAP_URL_LIMIT) {
    console.warn(
      `[sitemap] ${all.length} URLs exceeds Google's ${SITEMAP_URL_LIMIT} limit — split into a sitemap index`,
    );
  }

  return all;
}
