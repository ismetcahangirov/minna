"use client";

import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { useRouter } from "@/i18n/navigation";
import { setLibraryVisibility } from "@/lib/members/actions";

interface VisibilityToggleProps {
  /** Whether other members may currently open this library. */
  isPublic: boolean;
}

/**
 * Opens or closes the member's library to the rest of the site (MEM-04).
 *
 * The directory always lists a member — that is what makes people findable —
 * but whether their shelves are readable is theirs to decide, so this sits on
 * their own library page as a single switch. The new state shows immediately
 * and rolls back if the write fails.
 */
export function VisibilityToggle({ isPublic }: VisibilityToggleProps) {
  const t = useTranslations("library");
  const router = useRouter();
  const [current, setCurrent] = useState(isPublic);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !current;
    setCurrent(next);
    startTransition(async () => {
      const result = await setLibraryVisibility(next);
      if (!result.ok) setCurrent(!next);
      else router.refresh();
    });
  }

  const Icon = current ? Eye : EyeOff;

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-xs transition-colors outline-none disabled:opacity-50"
    >
      <Icon className="size-4" aria-hidden />
      <span>{current ? t("visibilityPublic") : t("visibilityPrivate")}</span>
      <span className="text-primary font-semibold">
        {current ? t("makePrivate") : t("makePublic")}
      </span>
    </button>
  );
}
