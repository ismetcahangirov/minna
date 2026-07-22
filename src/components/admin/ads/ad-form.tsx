"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import type { AdFormState } from "@/lib/admin/ads/actions";

export interface AdFormValues {
  title: string;
  videoUrl: string;
  targetUrl: string;
  durationSeconds: string;
  skipAfterSeconds: string;
  weight: string;
  active: boolean;
}

interface AdFormProps {
  action: (prev: AdFormState, formData: FormData) => Promise<AdFormState>;
  submitKey: "create" | "save";
  defaultValues?: Partial<AdFormValues>;
}

const inputClass =
  "bg-input/30 border-border text-foreground placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-ring/50 w-full border px-3 py-2 text-sm outline-none focus-visible:ring-3";

function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-foreground text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p className="text-muted-foreground text-xs">{hint}</p>
      )}
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}

/**
 * Create/edit form for a pre-roll ad (ADMIN-02). Uses `useActionState` so the
 * server action can return field-level validation without losing the user's
 * input; on success the action redirects back to the list. Field error values
 * are i18n keys resolved here.
 */
export function AdForm({ action, submitKey, defaultValues }: AdFormProps) {
  const t = useTranslations("admin.ads");
  const [state, formAction, pending] = useActionState<AdFormState, FormData>(
    action,
    {},
  );
  const fe = state.fieldErrors ?? {};
  const err = (key?: string) => (key ? t(`errors.${key}`) : undefined);

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-5">
      {state.error && (
        <p className="border-destructive/40 bg-destructive/10 text-destructive border px-3 py-2 text-sm">
          {t(`errors.${state.error}`)}
        </p>
      )}

      <Field label={t("fields.title")} htmlFor="title" error={err(fe.title)}>
        <input
          id="title"
          name="title"
          type="text"
          required
          maxLength={200}
          defaultValue={defaultValues?.title ?? ""}
          className={inputClass}
        />
      </Field>

      <Field
        label={t("fields.videoUrl")}
        htmlFor="videoUrl"
        hint={t("fields.videoUrlHint")}
        error={err(fe.videoUrl)}
      >
        <input
          id="videoUrl"
          name="videoUrl"
          type="url"
          required
          placeholder="https://"
          defaultValue={defaultValues?.videoUrl ?? ""}
          className={inputClass}
        />
      </Field>

      <Field
        label={t("fields.targetUrl")}
        htmlFor="targetUrl"
        hint={t("fields.targetUrlHint")}
        error={err(fe.targetUrl)}
      >
        <input
          id="targetUrl"
          name="targetUrl"
          type="url"
          placeholder="https://"
          defaultValue={defaultValues?.targetUrl ?? ""}
          className={inputClass}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field
          label={t("fields.skipAfterSeconds")}
          htmlFor="skipAfterSeconds"
          hint={t("fields.skipAfterHint")}
          error={err(fe.skipAfterSeconds)}
        >
          <input
            id="skipAfterSeconds"
            name="skipAfterSeconds"
            type="number"
            min={0}
            max={600}
            defaultValue={defaultValues?.skipAfterSeconds ?? "5"}
            className={inputClass}
          />
        </Field>

        <Field
          label={t("fields.durationSeconds")}
          htmlFor="durationSeconds"
          hint={t("fields.durationHint")}
          error={err(fe.durationSeconds)}
        >
          <input
            id="durationSeconds"
            name="durationSeconds"
            type="number"
            min={1}
            max={3600}
            defaultValue={defaultValues?.durationSeconds ?? ""}
            className={inputClass}
          />
        </Field>

        <Field
          label={t("fields.weight")}
          htmlFor="weight"
          hint={t("fields.weightHint")}
          error={err(fe.weight)}
        >
          <input
            id="weight"
            name="weight"
            type="number"
            min={1}
            max={1000}
            defaultValue={defaultValues?.weight ?? "1"}
            className={inputClass}
          />
        </Field>
      </div>

      <label className="flex items-center gap-2.5 text-sm">
        <input
          type="checkbox"
          name="active"
          defaultChecked={defaultValues?.active ?? true}
          className="accent-primary size-4"
        />
        <span className="text-foreground font-medium">
          {t("fields.active")}
        </span>
      </label>

      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" disabled={pending}>
          {pending ? t("saving") : t(submitKey)}
        </Button>
        <Button
          type="button"
          variant="ghost"
          nativeButton={false}
          render={<Link href="/admin/ads" />}
        >
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}
