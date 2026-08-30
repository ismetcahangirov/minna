import { Calendar, Film, Layers, Play, Star, Tv } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { type ReactNode, Suspense } from "react";

import { FavoriteButton } from "@/components/anime/favorite-button";
import { DetailBanner } from "@/components/anime/detail-banner";
import {
  DetailEpisodes,
  DetailEpisodesSkeleton,
} from "@/components/anime/detail-episodes";
import { HeroInitialScroll } from "@/components/anime/hero-initial-scroll";
import { SeasonSwitcher } from "@/components/anime/season-tabs";
import { AdBanner } from "@/components/home/ad-banner";
import { LibraryProgressBar } from "@/components/library/progress-bar";
import { LibraryStatusMenu } from "@/components/library/status-menu";
import { JsonLd } from "@/components/seo/json-ld";
import { Button } from "@/components/ui/button";
import { stripHtml } from "@/lib/anime/text";
import type { AnimeDetail } from "@/lib/anime/types";
import type { LibraryEntry } from "@/lib/library/types";
import { buildAnimeJsonLd } from "@/lib/seo/anime-jsonld";

interface AnimeDetailViewProps {
  detail: AnimeDetail;
  isAuthenticated: boolean;
  isFavorite: boolean;
  /** The viewer's library entry for this anime, or null when it is not filed. */
  libraryEntry: LibraryEntry | null;
  /** Login flow target for the favorite button when signed out. */
  loginHref: string;
  /** Canonical detail path — the episode list's own links point back at it. */
  basePath: string;
  /** `?season=` — which season card is open, unverified against the chain. */
  season: string | null;
  /** `?page=` of the episode list, or null when the value was junk. */
  page: number | null;
  /** `?order=desc` — the episode list is newest-first. */
  descending: boolean;
  /** `?q=` — the episode list's active filter. */
  query: string | null;
}

/** One label/value row in the side info panel; renders nothing when empty. */
function InfoRow({ label, value }: { label: string; value: ReactNode | null }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="border-border flex items-baseline justify-between gap-4 border-b py-2 last:border-b-0">
      <dt className="text-muted-foreground text-xs tracking-wide uppercase">
        {label}
      </dt>
      <dd className="text-foreground text-right text-sm font-medium">
        {value}
      </dd>
    </div>
  );
}

/**
 * Anime detail page view (DETAIL-01/02/03): a banner hero with the poster,
 * title, rating/meta and actions, followed by the synopsis, a side info panel
 * and the episode list. Server component — the only client islands are the
 * favorite toggle and the episode order control.
 *
 * Design system: black base, flat black legibility layers (no gradient, no
 * glassmorphism), sharp corners, Netflix-red accent, lucide icons.
 */
export async function AnimeDetailView({
  detail,
  isAuthenticated,
  isFavorite,
  libraryEntry,
  loginHref,
  basePath,
  season,
  page,
  descending,
  query,
}: AnimeDetailViewProps) {
  const t = await getTranslations("detail");
  const tLibrary = await getTranslations("library");

  const backdrop = detail.banner ?? detail.image;
  const score = detail.rating !== null ? (detail.rating / 10).toFixed(1) : null;
  const episodeCount = detail.totalEpisodes ?? (detail.episodes.length || null);
  const hasEpisodes = detail.episodes.length > 0;
  // The library row's own count wins over the catalog's, so a series whose
  // length changed after it was filed keeps a bar that matches its counter.
  const libraryTotal = libraryEntry?.totalEpisodes ?? episodeCount;
  const synopsis = detail.description ? stripHtml(detail.description) : null;

  const metaItems = [
    score && { icon: Star, text: score },
    detail.releaseYear && { icon: Calendar, text: String(detail.releaseYear) },
    detail.type && { icon: Tv, text: detail.type },
    episodeCount && {
      icon: Layers,
      text: `${episodeCount} ${t("episodes").toLowerCase()}`,
    },
  ].filter(Boolean) as { icon: typeof Star; text: string }[];

  return (
    <article className="flex flex-col">
      <JsonLd data={buildAnimeJsonLd(detail, basePath)} />
      <HeroInitialScroll targetId="detail-body" viewportRatio={0.62} />
      {/* Hero */}
      <section className="relative flex min-h-[78vh] w-full items-end overflow-hidden bg-black sm:min-h-[96vh] lg:min-h-[123vh]">
        {backdrop && <DetailBanner src={backdrop} />}
        {/* Legibility scrim: transparent up top, ramping gradually to solid black
            at the bottom where the title/actions sit — no hard seam on the banner. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[52%] bg-[linear-gradient(to_top,#000_0%,rgba(0,0,0,0.82)_32%,rgba(0,0,0,0.35)_62%,transparent_100%)] sm:h-[72%]" />
        {/* Soft shadow seam where the banner meets the details below. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-px shadow-[0_-1px_28px_10px_rgba(0,0,0,0.85),0_1px_0_0_rgba(255,255,255,0.06)]" />

        <div
          id="hero-info"
          className="relative mx-auto w-full max-w-[1600px] px-4 pt-32 pb-10 sm:px-6 sm:pt-48 lg:px-8 lg:pt-64"
        >
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:gap-8">
            {/* Poster */}
            <div className="border-border bg-surface relative aspect-[2/3] w-36 shrink-0 self-start overflow-hidden border sm:w-44 lg:w-52">
              {detail.image ? (
                <Image
                  src={detail.image}
                  alt={detail.title}
                  fill
                  priority
                  sizes="(max-width: 640px) 144px, 208px"
                  className="object-cover"
                />
              ) : (
                <div className="text-muted-foreground flex h-full w-full items-center justify-center">
                  <Film className="size-10" aria-hidden />
                </div>
              )}
            </div>

            {/* Title + meta + actions */}
            <div className="min-w-0 flex-1">
              {detail.genres.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {detail.genres.slice(0, 4).map((genre) => (
                    <span
                      key={genre}
                      className="border-border/80 text-foreground/90 border px-2 py-0.5 text-[11px] font-medium tracking-wide uppercase"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              )}

              <h1 className="text-foreground text-2xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
                {detail.title}
              </h1>

              {(detail.titleRomaji || detail.titleNative) &&
                detail.titleRomaji !== detail.title && (
                  <p className="text-muted-foreground mt-1 text-sm">
                    {detail.titleRomaji ?? detail.titleNative}
                  </p>
                )}

              {metaItems.length > 0 && (
                <div className="text-muted-foreground mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  {metaItems.map(({ icon: Icon, text }, index) => (
                    <span
                      key={index}
                      className="text-foreground inline-flex items-center gap-1.5 font-medium"
                    >
                      <Icon
                        className={
                          Icon === Star
                            ? "text-primary size-4 fill-current"
                            : "text-muted-foreground size-4"
                        }
                        aria-hidden
                      />
                      {text}
                    </span>
                  ))}
                  {detail.status && (
                    <span className="text-muted-foreground capitalize">
                      {detail.status.replace(/_/g, " ").toLowerCase()}
                    </span>
                  )}
                </div>
              )}

              <div className="mt-6 flex flex-wrap gap-3">
                {hasEpisodes && (
                  // The episode list is on this page now, so the button jumps
                  // down to it instead of navigating anywhere.
                  <Button
                    size="lg"
                    nativeButton={false}
                    render={<a href="#episodes" />}
                  >
                    <Play className="fill-current" aria-hidden />
                    {t("watchNow")}
                  </Button>
                )}
                <FavoriteButton
                  animeId={detail.id}
                  title={detail.title}
                  image={detail.image}
                  initialIsFavorite={isFavorite}
                  isAuthenticated={isAuthenticated}
                  loginHref={loginHref}
                />
                <LibraryStatusMenu
                  animeId={detail.id}
                  title={detail.title}
                  image={detail.image}
                  totalEpisodes={episodeCount}
                  status={libraryEntry?.status ?? null}
                  loginHref={isAuthenticated ? null : loginHref}
                />
              </div>

              {/* How far the viewer is through the series (LIB-04). The counter
                  behind it is kept on the library row, so this costs no extra
                  work beyond the entry the page already read. */}
              {libraryEntry && libraryEntry.episodesWatched > 0 && (
                <LibraryProgressBar
                  watched={libraryEntry.episodesWatched}
                  total={libraryTotal}
                  label={
                    libraryTotal
                      ? tLibrary("progress", {
                          watched: libraryEntry.episodesWatched,
                          total: libraryTotal,
                        })
                      : tLibrary("progressUnknown", {
                          watched: libraryEntry.episodesWatched,
                        })
                  }
                  className="mt-5 max-w-md"
                />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Body */}
      <div
        id="detail-body"
        className="mx-auto w-full max-w-[1600px] px-4 py-10 sm:px-6 lg:px-8"
      >
        <div className="grid gap-10 md:grid-cols-3">
          <div className="flex min-w-0 flex-col gap-10 md:col-span-2">
            {synopsis && (
              <section>
                <h2 className="text-foreground mb-3 text-lg font-bold tracking-tight sm:text-xl">
                  {t("synopsis")}
                </h2>
                <p className="text-muted-foreground max-w-3xl text-sm leading-relaxed">
                  {synopsis}
                </p>
              </section>
            )}
          </div>

          <aside className="md:col-span-1">
            <dl className="border-border bg-surface border p-4">
              <InfoRow label={t("info.type")} value={detail.type} />
              <InfoRow
                label={t("info.status")}
                value={
                  detail.status ? (
                    <span className="capitalize">
                      {detail.status.replace(/_/g, " ").toLowerCase()}
                    </span>
                  ) : null
                }
              />
              <InfoRow label={t("info.year")} value={detail.releaseYear} />
              <InfoRow label={t("info.episodes")} value={episodeCount} />
              <InfoRow label={t("info.season")} value={detail.season} />
              <InfoRow
                label={t("info.duration")}
                value={
                  detail.duration
                    ? t("info.durationValue", { minutes: detail.duration })
                    : null
                }
              />
              <InfoRow
                label={t("info.studios")}
                value={
                  detail.studios.length > 0 ? detail.studios.join(", ") : null
                }
              />
            </dl>
          </aside>
        </div>

        {/* Seasons and the episodes of whichever one is open. Full width, so
            the cards read exactly as they do on the episodes route. */}
        <section className="mt-10 flex flex-col gap-10">
          <SeasonSwitcher
            detail={detail}
            basePath={basePath}
            activeSeasonId={season}
          />
          {/* The anchor every season card and the hero's watch button jump to,
              on the wrapper rather than inside the boundary so it exists before
              the list has streamed in. No scroll margin: the "Episodes" heading
              is meant to land flush at the top of the viewport, and the header
              has slid away by then — the jump is a downward scroll, which is
              what hides it. */}
          <div id="episodes">
            <Suspense fallback={<DetailEpisodesSkeleton />}>
              <DetailEpisodes
                detail={detail}
                basePath={basePath}
                season={season}
                page={page}
                descending={descending}
                query={query}
              />
            </Suspense>
          </div>
        </section>

        <AdBanner placement="anime" className="mt-10" />
      </div>
    </article>
  );
}
