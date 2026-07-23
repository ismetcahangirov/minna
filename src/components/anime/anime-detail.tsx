import { Calendar, Film, Layers, Play, Star, Tv } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { EpisodeList } from "@/components/anime/episode-list";
import { FavoriteButton } from "@/components/anime/favorite-button";
import { ParallaxBanner } from "@/components/anime/parallax-banner";
import { SeasonSwitcher } from "@/components/anime/season-tabs";
import { Button } from "@/components/ui/button";
import { stripHtml } from "@/lib/anime/text";
import type { AnimeDetail } from "@/lib/anime/types";

interface AnimeDetailViewProps {
  detail: AnimeDetail;
  isAuthenticated: boolean;
  isFavorite: boolean;
  /** Login flow target for the favorite button when signed out. */
  loginHref: string;
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
  loginHref,
}: AnimeDetailViewProps) {
  const t = await getTranslations("detail");

  const backdrop = detail.banner ?? detail.image;
  const score = detail.rating !== null ? (detail.rating / 10).toFixed(1) : null;
  const episodeCount = detail.totalEpisodes ?? (detail.episodes.length || null);
  const firstEpisode = [...detail.episodes].sort(
    (a, b) => a.number - b.number,
  )[0];
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
      {/* Hero */}
      <section className="relative w-full overflow-hidden bg-black">
        {backdrop && <ParallaxBanner src={backdrop} />}
        {/* Flat legibility layers — no gradient (design system). */}
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-black/70" />

        <div className="relative mx-auto w-full max-w-[1600px] px-4 pt-24 pb-10 sm:px-6 lg:px-8 lg:pt-28">
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
                {firstEpisode && (
                  <Button
                    size="lg"
                    nativeButton={false}
                    render={
                      <Link
                        href={`/watch/${detail.id}/${encodeURIComponent(firstEpisode.id)}`}
                      />
                    }
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
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Body */}
      <div className="mx-auto w-full max-w-[1600px] px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-3">
          <div className="flex flex-col gap-10 md:col-span-2">
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

            <SeasonSwitcher detail={detail} />

            <EpisodeList animeId={detail.id} episodes={detail.episodes} />
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
      </div>
    </article>
  );
}
