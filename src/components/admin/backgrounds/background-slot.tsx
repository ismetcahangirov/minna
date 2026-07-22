"use client";

import { Check, RotateCcw } from "lucide-react";
import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  clearBackgroundVideoAction,
  setBackgroundActiveAction,
  setBackgroundVideoAction,
  type BackgroundFormState,
} from "@/lib/admin/backgrounds/actions";
import type {
  BackgroundPage,
  BackgroundVariant,
} from "@/lib/backgrounds/config";
import { cn } from "@/lib/utils";

interface Current {
  videoUrl: string;
  active: boolean;
}

interface BackgroundSlotProps {
  page: BackgroundPage;
  variant: BackgroundVariant;
  current: Current | null;
}

const inputClass =
  "bg-input/30 border-border text-foreground placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-ring/50 w-full border px-3 py-2 text-sm outline-none focus-visible:ring-3";

/**
 * One page/variant background override slot (ADMIN-04): shows whether the page
 * is on its default or an admin override, lets an admin set a validated video
 * URL, and — when an override exists — toggle it on/off or reset to the default.
 * The set URL passes the ADMIN-03 gate server-side before it is saved.
 */
export function BackgroundSlot({
  page,
  variant,
  current,
}: BackgroundSlotProps) {
  const t = useTranslations("admin.backgrounds");
  const [state, formAction, pending] = useActionState<
    BackgroundFormState,
    FormData
  >(setBackgroundVideoAction.bind(null, page, variant), {});

  return (
    <div className="border-border bg-card border p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-foreground text-sm font-semibold">
          {t(`variants.${variant}`)}
        </h3>
        {current ? (
          <form
            action={setBackgroundActiveAction.bind(
              null,
              page,
              variant,
              !current.active,
            )}
          >
            <button
              type="submit"
              className={cn(
                "px-2 py-0.5 text-xs font-semibold tracking-wide uppercase transition-colors",
                current.active
                  ? "bg-primary text-primary-foreground hover:bg-primary/80"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {current.active ? t("active") : t("inactive")}
            </button>
          </form>
        ) : (
          <span className="text-muted-foreground text-xs tracking-wide uppercase">
            {t("usingDefault")}
          </span>
        )}
      </div>

      <form action={formAction} className="flex flex-col gap-2">
        <input
          name="videoUrl"
          type="url"
          placeholder="https://"
          defaultValue={current?.videoUrl ?? ""}
          className={inputClass}
        />
        <p className="text-muted-foreground text-xs">{t("videoUrlHint")}</p>
        {state.error && (
          <p className="text-destructive text-xs">
            {t(`errors.${state.error}`)}
          </p>
        )}
        {state.ok && (
          <p className="text-muted-foreground flex items-center gap-1 text-xs">
            <Check className="size-3.5" aria-hidden />
            {t("saved")}
          </p>
        )}
        <div>
          <Button type="submit" disabled={pending}>
            {pending ? t("saving") : t("save")}
          </Button>
        </div>
      </form>

      {current && (
        <form
          action={clearBackgroundVideoAction.bind(null, page, variant)}
          onSubmit={(event) => {
            if (!window.confirm(t("confirmClear"))) event.preventDefault();
          }}
          className="mt-2"
        >
          <button
            type="submit"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs font-medium transition-colors"
          >
            <RotateCcw className="size-3.5" aria-hidden />
            {t("clear")}
          </button>
        </form>
      )}
    </div>
  );
}
