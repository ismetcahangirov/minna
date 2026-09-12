"use client";

import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { toggleFavorite } from "@/lib/favorites/actions";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  animeId: string;
  title: string;
  image?: string | null;
  initialIsFavorite: boolean;
  isAuthenticated: boolean;
  /** Login flow target (with a callbackUrl) for signed-out visitors. */
  loginHref: string;
  /**
   * True while the viewer's favorite state is still being read. The button is
   * rendered in its signed-in shape so the row does not move once the answer
   * arrives, but it cannot be pressed yet: a click on an unseeded button would
   * toggle *away* from a state it does not know.
   */
  loading?: boolean;
}

/**
 * "Add to favorites" control (DETAIL-03). Signed-out visitors get a link into
 * the Google login flow; signed-in users get an optimistic toggle backed by the
 * `toggleFavorite` server action, reverting if the write fails. Design system:
 * sharp corners, solid fill when active, lucide heart (never an emoji).
 */
export function FavoriteButton({
  animeId,
  title,
  image,
  initialIsFavorite,
  isAuthenticated,
  loginHref,
  loading = false,
}: FavoriteButtonProps) {
  const t = useTranslations("detail");
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [pending, startTransition] = useTransition();

  // On the detail page the seed arrives after mount — the page is cached at
  // the edge now, so nothing about the viewer is rendered into it (PERF-05).
  // Adjusting during render rather than in an effect is React's own pattern for
  // this, and the one this codebase lints for.
  const [seed, setSeed] = useState(initialIsFavorite);
  if (seed !== initialIsFavorite) {
    setSeed(initialIsFavorite);
    setIsFavorite(initialIsFavorite);
  }

  if (!isAuthenticated && !loading) {
    return (
      <Button
        size="lg"
        variant="outline"
        nativeButton={false}
        render={<Link href={loginHref} />}
      >
        <Heart aria-hidden />
        {t("loginToFavorite")}
      </Button>
    );
  }

  const onToggle = () => {
    const next = !isFavorite;
    setIsFavorite(next); // optimistic
    startTransition(async () => {
      const result = await toggleFavorite({ animeId, title, image });
      // Trust the server's outcome; revert on a failed write.
      setIsFavorite(result.ok ? result.isFavorite : !next);
    });
  };

  return (
    <Button
      type="button"
      size="lg"
      variant={isFavorite ? "default" : "outline"}
      onClick={onToggle}
      disabled={pending || loading}
      aria-pressed={isFavorite}
    >
      <Heart className={cn(isFavorite && "fill-current")} aria-hidden />
      {isFavorite ? t("inFavorites") : t("addToFavorites")}
    </Button>
  );
}
