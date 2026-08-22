"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { EpisodeSearchField } from "@/components/anime/episode-search-field";
import { animeEpisodesPageHref } from "@/lib/anime/href";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";

interface EpisodeSearchProps {
  animeId: string;
  animeTitle: string;
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
  animeId,
  animeTitle,
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
      animeEpisodesPageHref(animeId, animeTitle, {
        query: debounced,
        descending,
      }),
      { scroll: false },
    );
  }, [debounced, animeId, animeTitle, descending, router]);

  return (
    <form
      action={animeEpisodesPageHref(animeId, animeTitle)}
      role="search"
      className="w-full sm:max-w-sm"
    >
      {descending && <input type="hidden" name="order" value="desc" />}
      <EpisodeSearchField name="q" value={input} onValueChange={setInput} />
    </form>
  );
}
