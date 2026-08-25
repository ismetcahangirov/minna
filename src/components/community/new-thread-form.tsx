"use client";

import { Film, Search, X } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useActionState, useRef, useState } from "react";

import { COMMUNITY_ERROR_KEY } from "@/components/community/error-key";
import { Button } from "@/components/ui/button";
import { createThread, type ThreadFormState } from "@/lib/discussions/actions";
import {
  DISCUSSION_SCOPES,
  type DiscussionScope,
} from "@/lib/discussions/types";
import { TEXT_LIMITS } from "@/lib/moderation/limits";
import { cn } from "@/lib/utils";

/** An anime as offered by the picker's search results. */
interface AnimeOption {
  id: string;
  title: string;
  image: string | null;
  totalEpisodes: number | null;
}

/** A season of the picked anime, as the context endpoint reports it. */
interface SeasonOption {
  id: string;
  title: string;
}

const INITIAL: ThreadFormState = { status: "idle" };

/** Debounce before a keystroke turns into a search request. */
const SEARCH_DELAY_MS = 350;

/** Shortest query worth sending upstream. */
const MIN_QUERY = 2;

const fieldClass =
  "border-border bg-surface text-foreground placeholder:text-muted-foreground/70 focus-visible:border-primary/60 w-full border px-3 py-2 text-sm outline-none transition-colors";

const labelClass =
  "text-muted-foreground text-xs font-semibold tracking-wide uppercase";

/** Message key under the `community` namespace for each scope. */
const SCOPE_KEY: Record<DiscussionScope, string> = {
  anime: "scopeAnime",
  season: "scopeSeason",
  episode: "scopeEpisode",
};

/**
 * The "start a discussion" form (COMM-01).
 *
 * A member searches the catalog, picks an anime, then says what the thread is
 * about: the whole series, one of its seasons, or a single episode. Seasons and
 * the episode count are fetched once, when an anime is picked, from the
 * Redis-cached context endpoint — nothing is loaded until there is something to
 * load it for.
 *
 * The write itself is a server action: the title and the opening post are
 * checked for offensive language server-side, so a refusal comes back as a
 * message next to the field with the member's text still in it.
 */
export function NewThreadForm() {
  const t = useTranslations("community");
  const [state, formAction, pending] = useActionState(createThread, INITIAL);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AnimeOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<AnimeOption | null>(null);
  const [seasons, setSeasons] = useState<SeasonOption[]>([]);
  const [totalEpisodes, setTotalEpisodes] = useState<number | null>(null);
  const [scope, setScope] = useState<DiscussionScope>("anime");
  const [seasonId, setSeasonId] = useState("");

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const search = useRef<AbortController | null>(null);

  async function runSearch(value: string) {
    search.current?.abort();
    const controller = new AbortController();
    search.current = controller;

    try {
      const response = await fetch(
        `/api/anime/search?q=${encodeURIComponent(value)}`,
        { signal: controller.signal },
      );
      const data = (await response.json()) as {
        results?: Array<{
          id: string;
          title: string;
          image: string | null;
          totalEpisodes: number | null;
        }>;
      };
      if (controller.signal.aborted) return;

      setResults(
        (data.results ?? []).slice(0, 8).map((item) => ({
          id: item.id,
          title: item.title,
          image: item.image,
          totalEpisodes: item.totalEpisodes,
        })),
      );
      setSearching(false);
    } catch {
      // Aborted by a newer keystroke, or the network is gone: leave whatever is
      // on screen rather than blanking the list mid-typing.
      if (!controller.signal.aborted) setSearching(false);
    }
  }

  function onQueryChange(value: string) {
    setQuery(value);
    if (timer.current) clearTimeout(timer.current);

    if (value.trim().length < MIN_QUERY) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    timer.current = setTimeout(
      () => void runSearch(value.trim()),
      SEARCH_DELAY_MS,
    );
  }

  async function pick(option: AnimeOption) {
    setPicked(option);
    setResults([]);
    setQuery("");
    setSeasons([]);
    setSeasonId("");
    setScope("anime");
    setTotalEpisodes(option.totalEpisodes);

    try {
      const response = await fetch(
        `/api/community/anime-context?id=${encodeURIComponent(option.id)}`,
      );
      if (!response.ok) return;
      const data = (await response.json()) as {
        totalEpisodes: number | null;
        seasons: SeasonOption[];
      };
      setTotalEpisodes(data.totalEpisodes ?? option.totalEpisodes);
      setSeasons(data.seasons ?? []);
    } catch {
      // The picker still works without the extra context: the member simply
      // gets no season list and an unbounded episode number.
    }
  }

  function reset() {
    setPicked(null);
    setSeasons([]);
    setSeasonId("");
    setScope("anime");
    setTotalEpisodes(null);
  }

  const error = state.error ? t(COMMUNITY_ERROR_KEY[state.error]) : null;
  const season = seasons.find((entry) => entry.id === seasonId);

  return (
    <form action={formAction} className="flex flex-col gap-8">
      {/* Step 1 — the anime */}
      <section className="flex flex-col gap-3">
        <h2 className={labelClass}>{t("stepAnime")}</h2>

        {picked ? (
          <div className="border-border bg-surface flex items-center gap-3 border p-3">
            <div className="border-border relative h-16 w-11 shrink-0 overflow-hidden border">
              {picked.image ? (
                <Image
                  src={picked.image}
                  alt=""
                  fill
                  sizes="44px"
                  className="object-cover"
                />
              ) : (
                <div className="text-muted-foreground flex h-full w-full items-center justify-center">
                  <Film className="size-4" aria-hidden />
                </div>
              )}
            </div>
            <p className="text-foreground min-w-0 flex-1 text-sm font-semibold">
              {picked.title}
            </p>
            <button
              type="button"
              onClick={reset}
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs transition-colors"
            >
              <X className="size-4" aria-hidden />
              {t("change")}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="relative">
              <Search
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder={t("searchAnimePlaceholder")}
                aria-label={t("searchAnime")}
                className={cn(fieldClass, "pl-9")}
              />
            </div>

            {searching && (
              <p className="text-muted-foreground text-xs">{t("searching")}</p>
            )}

            {!searching &&
              query.trim().length >= MIN_QUERY &&
              results.length === 0 && (
                <p className="text-muted-foreground text-xs">
                  {t("noResults")}
                </p>
              )}

            {results.length > 0 && (
              <ul className="border-border divide-border divide-y border">
                {results.map((option) => (
                  <li key={option.id}>
                    <button
                      type="button"
                      onClick={() => void pick(option)}
                      className="hover:bg-muted flex w-full items-center gap-3 p-2 text-left transition-colors"
                    >
                      <div className="border-border relative h-14 w-10 shrink-0 overflow-hidden border">
                        {option.image ? (
                          <Image
                            src={option.image}
                            alt=""
                            fill
                            sizes="40px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="text-muted-foreground flex h-full w-full items-center justify-center">
                            <Film className="size-4" aria-hidden />
                          </div>
                        )}
                      </div>
                      <span className="text-foreground min-w-0 flex-1 truncate text-sm">
                        {option.title}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      {/* Step 2 — what the thread is about */}
      {picked && (
        <section className="flex flex-col gap-3">
          <h2 className={labelClass}>{t("stepScope")}</h2>

          <div className="flex flex-wrap gap-2">
            {DISCUSSION_SCOPES.map((value) => {
              const disabled = value === "season" && seasons.length < 2;
              return (
                <button
                  key={value}
                  type="button"
                  disabled={disabled}
                  onClick={() => setScope(value)}
                  className={cn(
                    "border px-3 py-1.5 text-sm font-medium transition-colors",
                    scope === value
                      ? "border-primary text-primary"
                      : "border-border text-muted-foreground hover:text-foreground",
                    disabled && "cursor-not-allowed opacity-40",
                  )}
                >
                  {t(SCOPE_KEY[value])}
                </button>
              );
            })}
          </div>

          {scope === "season" && seasons.length > 1 && (
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>{t("selectSeason")}</span>
              <select
                value={seasonId}
                onChange={(event) => setSeasonId(event.target.value)}
                className={fieldClass}
              >
                <option value="">—</option>
                {seasons.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.title}
                  </option>
                ))}
              </select>
              <span className="text-muted-foreground text-xs">
                {t("selectSeasonHint")}
              </span>
            </label>
          )}

          {scope === "episode" && (
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>{t("episodeNumber")}</span>
              <input
                name="episodeNumber"
                type="number"
                min={1}
                max={totalEpisodes ?? undefined}
                defaultValue={1}
                required
                className={cn(fieldClass, "max-w-32")}
              />
            </label>
          )}
        </section>
      )}

      {/* Step 3 — the post itself */}
      {picked && (
        <section className="flex flex-col gap-4">
          <h2 className={labelClass}>{t("stepDetails")}</h2>

          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>{t("threadTitle")}</span>
            <input
              name="title"
              type="text"
              required
              maxLength={TEXT_LIMITS.threadTitle.max}
              placeholder={t("threadTitlePlaceholder")}
              className={fieldClass}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>{t("threadBody")}</span>
            <textarea
              name="body"
              rows={6}
              maxLength={TEXT_LIMITS.threadBody.max}
              placeholder={t("threadBodyPlaceholder")}
              className={cn(fieldClass, "resize-y")}
            />
          </label>
        </section>
      )}

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}

      {/* What the action reads; the visible controls only choose these values. */}
      <input type="hidden" name="scope" value={scope} />
      <input type="hidden" name="animeId" value={picked?.id ?? ""} />
      <input type="hidden" name="animeTitle" value={picked?.title ?? ""} />
      <input type="hidden" name="animeImage" value={picked?.image ?? ""} />
      <input
        type="hidden"
        name="seasonId"
        value={scope === "season" ? seasonId : ""}
      />
      <input
        type="hidden"
        name="seasonLabel"
        value={scope === "season" ? (season?.title ?? "") : ""}
      />

      <div>
        <Button type="submit" size="lg" disabled={!picked || pending}>
          {pending ? t("publishing") : t("publish")}
        </Button>
      </div>
    </form>
  );
}
