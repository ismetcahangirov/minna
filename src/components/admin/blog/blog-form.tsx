"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import type { BlogFormState } from "@/lib/admin/blog/actions";

export interface BlogFormValues {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  author: string;
  published: boolean;
}

interface BlogFormProps {
  action: (prev: BlogFormState, formData: FormData) => Promise<BlogFormState>;
  submitKey: "create" | "save";
  defaultValues?: Partial<BlogFormValues>;
}

const controlClass =
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
 * Create/edit form for a blog post (ADMIN-05). Body content is plain text —
 * blank lines separate paragraphs on the public page — so a textarea is enough.
 * `useActionState` returns field errors as i18n keys without dropping input; on
 * success the action redirects to the list.
 */
export function BlogForm({ action, submitKey, defaultValues }: BlogFormProps) {
  const t = useTranslations("admin.blogs");
  const [state, formAction, pending] = useActionState<BlogFormState, FormData>(
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
          className={controlClass}
        />
      </Field>

      <Field
        label={t("fields.slug")}
        htmlFor="slug"
        hint={t("fields.slugHint")}
        error={err(fe.slug)}
      >
        <input
          id="slug"
          name="slug"
          type="text"
          placeholder="my-post"
          defaultValue={defaultValues?.slug ?? ""}
          className={controlClass}
        />
      </Field>

      <Field
        label={t("fields.excerpt")}
        htmlFor="excerpt"
        hint={t("fields.excerptHint")}
      >
        <textarea
          id="excerpt"
          name="excerpt"
          rows={2}
          defaultValue={defaultValues?.excerpt ?? ""}
          className={controlClass}
        />
      </Field>

      <Field
        label={t("fields.content")}
        htmlFor="content"
        hint={t("fields.contentHint")}
        error={err(fe.content)}
      >
        <textarea
          id="content"
          name="content"
          rows={12}
          required
          defaultValue={defaultValues?.content ?? ""}
          className={`${controlClass} resize-y`}
        />
      </Field>

      <Field
        label={t("fields.coverImage")}
        htmlFor="coverImage"
        hint={t("fields.coverImageHint")}
        error={err(fe.coverImage)}
      >
        <input
          id="coverImage"
          name="coverImage"
          type="url"
          placeholder="https://"
          defaultValue={defaultValues?.coverImage ?? ""}
          className={controlClass}
        />
      </Field>

      <Field label={t("fields.author")} htmlFor="author">
        <input
          id="author"
          name="author"
          type="text"
          defaultValue={defaultValues?.author ?? ""}
          className={controlClass}
        />
      </Field>

      <label className="flex items-center gap-2.5 text-sm">
        <input
          type="checkbox"
          name="published"
          defaultChecked={defaultValues?.published ?? true}
          className="accent-primary size-4"
        />
        <span className="text-foreground font-medium">
          {t("fields.published")}
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
          render={<Link href="/admin/blogs" />}
        >
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}
