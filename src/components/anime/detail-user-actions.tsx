"use client";

import { FavoriteButton } from "@/components/anime/favorite-button";
import { LibraryStatusMenu } from "@/components/library/status-menu";
import { useAnimeUserState } from "@/lib/hooks/use-viewer";

interface DetailUserActionsProps {
  animeId: string;
  title: string;
  image?: string | null;
  /** Series length, carried into a new library row. */
  totalEpisodes: number | null;
  /** Login flow target (with a callbackUrl) for signed-out visitors. */
  loginHref: string;
}

/**
 * The two controls on the detail page that depend on who is looking: the
 * favorite toggle and the library shelf menu (PERF-05).
 *
 * They used to be seeded from the page, which meant the page read the session,
 * which meant it could not be cached and every crawler hit rendered a
 * personalised copy of a page with nothing personal on it. Both seeds are read
 * here instead, in one request shared with the rest of the page's islands.
 *
 * Both controls render in their signed-in shape while the answer is in flight —
 * disabled, but exactly the size they will settle at — so the action row never
 * moves and a member never watches a Login button flash past.
 */
export function DetailUserActions({
  animeId,
  title,
  image,
  totalEpisodes,
  loginHref,
}: DetailUserActionsProps) {
  const { isAuthenticated, known, state, loaded } = useAnimeUserState(animeId);
  const loading = !known || (isAuthenticated && !loaded);

  return (
    <>
      <FavoriteButton
        animeId={animeId}
        title={title}
        image={image}
        initialIsFavorite={state.favorite}
        isAuthenticated={isAuthenticated}
        loginHref={loginHref}
        loading={loading}
      />
      <LibraryStatusMenu
        animeId={animeId}
        title={title}
        image={image}
        totalEpisodes={totalEpisodes}
        status={state.library?.status ?? null}
        loginHref={isAuthenticated || loading ? null : loginHref}
        loading={loading}
      />
    </>
  );
}
