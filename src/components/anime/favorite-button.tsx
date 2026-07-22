"use client";

import { Heart } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
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
}: FavoriteButtonProps) {
  const t = useTranslations("detail");
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [pending, startTransition] = useTransition();

  if (!isAuthenticated) {
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
      disabled={pending}
      aria-pressed={isFavorite}
    >
      <Heart className={cn(isFavorite && "fill-current")} aria-hidden />
      {isFavorite ? t("inFavorites") : t("addToFavorites")}
    </Button>
  );
}
