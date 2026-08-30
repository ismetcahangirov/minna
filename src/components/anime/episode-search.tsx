"use client";

import { useEffect, useRef, useState } from "react";

import { EpisodeSearchField } from "@/components/anime/episode-search-field";
import { useRouter } from "@/i18n/navigation";
import { episodeListHref } from "@/lib/anime/href";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";

interface EpisodeSearchProps {
  /** Path the list lives under — the detail page, or the episodes route. */
  basePath: string;
  /** Selected season id, kept in the URL so a search stays in that season. */
  season?: string | null;
  /** The `?q=` currently rendered by the server (empty when unfiltered). */
  query: string;
  /** Kept across searches so the sort order is not silently reset. */
  descending: boolean;
}

/**
 * Search box for the episodes list. The term lives in the URL (`?q=`) like the
 * page and the sort order do, so a filtered list is shareable and survives a
 * reload; typing debounces into a `replace` so the back button does not collect
 * every keystroke, and a new search always lands on the first page.
 *
 * It works without JavaScript too: the form GETs the same URL the debounce
 * would have pushed.
 */
export function EpisodeSearch({
  basePath,
  season = null,
  query,
  descending,
}: EpisodeSearchProps) {
  const router = useRouter();

  const [input, setInput] = useState(query);
  const debounced = useDebouncedValue(input, 350).trim();

  // The term this component last navigated to, so a URL change made elsewhere
  // (the back button, a pagination link) is not immediately overwritten.
  const navigatedTo = useRef(query);

  useEffect(() => {
    if (debounced === navigatedTo.current) return;
    navigatedTo.current = debounced;
    router.replace(
      episodeListHref(basePath, {
        season,
        query: debounced,
        descending,
      }),
      { scroll: false },
    );
  }, [debounced, basePath, season, descending, router]);

  return (
    <form action={basePath} role="search" className="w-full sm:max-w-sm">
      {season && <input type="hidden" name="season" value={season} />}
      {descending && <input type="hidden" name="order" value="desc" />}
      <EpisodeSearchField name="q" value={input} onValueChange={setInput} />
    </form>
  );
}
