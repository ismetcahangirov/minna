import { animeHref } from "@/lib/anime/href";
import { stripHtml } from "@/lib/anime/text";
import type { AnimeDetail } from "@/lib/anime/types";
import type { JsonLdData } from "@/components/seo/json-ld";
import { absoluteUrl } from "@/lib/seo/site";

/**
 * Structured data for an anime detail page (PERF-01): a `TVSeries` (or `Movie`
 * for film entries) node plus a `BreadcrumbList`, so Google can render a rich
 * result. `aggregateRating` is deliberately omitted — AniList gives an average
 * score but no reliable rating count, and rating markup without a count trips
 * Google's rich-result validator.
 */
export function buildAnimeJsonLd(detail: AnimeDetail): JsonLdData {
  const url = absoluteUrl(animeHref(detail.id, detail.title));
  const image = detail.banner ?? detail.image ?? undefined;
  const description = detail.description
    ? stripHtml(detail.description).slice(0, 500)
    : undefined;
  const isMovie = detail.type?.toUpperCase() === "MOVIE";

  const work: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": isMovie ? "Movie" : "TVSeries",
    name: detail.title,
    url,
    inLanguage: "ja",
  };
  if (image) work.image = image;
  if (description) work.description = description;
  if (detail.genres.length > 0) work.genre = detail.genres;
  if (detail.releaseYear) work.datePublished = String(detail.releaseYear);
  if (detail.titleRomaji && detail.titleRomaji !== detail.title) {
    work.alternateName = detail.titleRomaji;
  }
  if (!isMovie) {
    const count = detail.totalEpisodes ?? (detail.episodes.length || null);
    if (count) work.numberOfEpisodes = count;
  }

  const breadcrumb: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: absoluteUrl("/"),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: detail.title,
        item: url,
      },
    ],
  };

  return [work, breadcrumb];
}
