import { Film, History, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import type { WatchHistoryItem } from "@/lib/watch/types";

/**
 * Continue-watching quick view for the profile page (PROFILE-03). A compact
 * grid of the most recently watched episodes (one per anime), each linking
 * straight back into the player to resume. Metadata is denormalized onto the
 * `watch_progress` row, so this renders without a Consumet round-trip. Server
 * component — no interactivity, so it stays out of the client bundle.
 */
export async function WatchHistoryPreview({
  items,
}: {
  items: WatchHistoryItem[];
}) {
  const t = await getTranslations("profile.history");

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-foreground text-xl font-bold tracking-tight">
          {t("title")}
        </h2>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </div>

      {items.length === 0 ? (
        <div className="border-border text-muted-foreground flex flex-col items-center gap-3 border border-dashed py-12 text-center">
          <History className="size-8" aria-hidden />
          <p className="text-foreground text-base font-medium">{t("empty")}</p>
          <p className="max-w-sm text-sm">{t("emptyHint")}</p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {items.map((item, index) => (
            <li key={item.episodeId}>
              <Link
                href={`/watch/${item.animeId}/${encodeURIComponent(item.episodeId)}`}
                className="group focus-visible:ring-ring block w-full outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                <div className="border-border bg-surface group-hover:border-primary/60 relative aspect-[2/3] overflow-hidden border transition-[transform,border-color] duration-300 group-hover:z-10 group-hover:scale-[1.03]">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.title ?? ""}
                      fill
                      priority={index < 6}
                      sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 180px"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="text-muted-foreground flex h-full w-full items-center justify-center">
                      <Film className="size-8" aria-hidden />
                    </div>
                  )}

                  <div className="absolute inset-0 flex items-center justify-center bg-black/70 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <span className="bg-primary text-primary-foreground flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold">
                      <Play className="size-3.5 fill-current" aria-hidden />
                      {t("resume")}
                    </span>
                  </div>

                  {/* Resume progress bar (PLAYER-05 position over runtime). */}
                  {item.progress > 0 && (
                    <div
                      className="absolute inset-x-0 bottom-0 h-1 bg-black/60"
                      aria-hidden
                    >
                      <div
                        className="bg-primary h-full"
                        style={{
                          width: `${Math.round(item.progress * 100)}%`,
                        }}
                      />
                    </div>
                  )}
                </div>

                <h3 className="text-foreground group-hover:text-primary mt-2 line-clamp-1 text-sm font-semibold transition-colors">
                  {item.title ?? item.animeId}
                </h3>
                {item.episodeNumber != null && (
                  <p className="text-muted-foreground text-xs">
                    {item.completed
                      ? t("completed")
                      : t("episode", { number: item.episodeNumber })}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
