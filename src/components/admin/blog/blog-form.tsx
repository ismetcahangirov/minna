"use client";

import { useActionState, useRef } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { BlogFormState } from "@/lib/admin/blog/actions";
import type { BlogMediaItem } from "@/lib/admin/blog/media-actions";
import type { BlogTranslationTarget } from "@/lib/admin/blog/queries";

import { BlogImagePanel } from "./blog-image-panel";
import { MarkdownToolbar } from "./markdown-toolbar";

export interface BlogFormValues {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  coverImageAlt: string;
  author: string;
  authorUrl: string;
  language: string;
  /** The translation group to join; empty means the post stands alone. */
  translationGroupId: string;
  /** Comma-separated tag names, as the field shows and submits them. */
  tags: string;
  published: boolean;
}

interface BlogFormProps {
  action: (prev: BlogFormState, formData: FormData) => Promise<BlogFormState>;
  submitKey: "create" | "save";
  defaultValues?: Partial<BlogFormValues>;
  /** The shared image library, offered for insertion into the body. */
  library: BlogMediaItem[];
  /** Existing tag names, offered as suggestions on the tag field. */
  tagSuggestions: string[];
  /** Posts this one can be declared a translation of. */
  translationTargets: BlogTranslationTarget[];
}

const controlClass =
  "bg-input/30 border-border text-foreground placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-ring/50 w-full border px-3 py-2 text-sm outline-none focus-visible:ring-3";

/** The locales the site ships, so a post can declare which one it is written in. */
const LANGUAGES = ["en", "tr", "ru"] as const;

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
 * Create/edit form for a blog post (ADMIN-05).
 *
 * The body is Markdown with hand-written semantic HTML allowed, so the textarea
 * stays a textarea — a rich-text editor would hide the markup the whole point
 * of this is to control. What it gains instead is a toolbar that writes the
 * markup at the cursor and an image library that inserts a described figure
 * wherever the caret sits.
 *
 * `useActionState` returns field errors as i18n keys without dropping input; on
 * success the action redirects to the list.
 */
export function BlogForm({
  action,
  submitKey,
  defaultValues,
  library,
  tagSuggestions,
  translationTargets,
}: BlogFormProps) {
  const t = useTranslations("admin.blogs");
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const [state, formAction, pending] = useActionState<BlogFormState, FormData>(
    action,
    {},
  );
  const fe = state.fieldErrors ?? {};
  const err = (key?: string) => (key ? t(`errors.${key}`) : undefined);

  return (
    <form action={formAction} className="flex max-w-3xl flex-col gap-5">
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
        <div className="flex flex-col">
          <MarkdownToolbar textareaRef={contentRef} />
          <textarea
            ref={contentRef}
            id="content"
            name="content"
            rows={18}
            required
            defaultValue={defaultValues?.content ?? ""}
            className={`${controlClass} resize-y font-mono text-[13px] leading-relaxed`}
          />
        </div>
      </Field>

      <BlogImagePanel textareaRef={contentRef} library={library} />

      <Field
        label={t("fields.tags")}
        htmlFor="tags"
        hint={t("fields.tagsHint")}
      >
        <input
          id="tags"
          name="tags"
          type="text"
          list="blog-tag-suggestions"
          placeholder={t("fields.tagsPlaceholder")}
          defaultValue={defaultValues?.tags ?? ""}
          className={controlClass}
        />
        {/* Suggestions only — a new name in the field creates a new tag. */}
        <datalist id="blog-tag-suggestions">
          {tagSuggestions.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
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

      <Field
        label={t("fields.coverImageAlt")}
        htmlFor="coverImageAlt"
        hint={t("fields.coverImageAltHint")}
      >
        <input
          id="coverImageAlt"
          name="coverImageAlt"
          type="text"
          maxLength={200}
          defaultValue={defaultValues?.coverImageAlt ?? ""}
          className={controlClass}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("fields.author")} htmlFor="author">
          <input
            id="author"
            name="author"
            type="text"
            defaultValue={defaultValues?.author ?? ""}
            className={controlClass}
          />
        </Field>

        <Field
          label={t("fields.authorUrl")}
          htmlFor="authorUrl"
          hint={t("fields.authorUrlHint")}
          error={err(fe.authorUrl)}
        >
          <input
            id="authorUrl"
            name="authorUrl"
            type="url"
            placeholder="https://"
            defaultValue={defaultValues?.authorUrl ?? ""}
            className={controlClass}
          />
        </Field>
      </div>

      <Field
        label={t("fields.language")}
        htmlFor="language"
        hint={t("fields.languageHint")}
        error={err(fe.language)}
      >
        <select
          id="language"
          name="language"
          defaultValue={defaultValues?.language ?? "en"}
          className={controlClass}
        >
          {LANGUAGES.map((code) => (
            <option key={code} value={code}>
              {t(`languages.${code}`)}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label={t("fields.translationOf")}
        htmlFor="translationGroupId"
        hint={t("fields.translationOfHint")}
        error={err(fe.translationGroupId)}
      >
        <select
          id="translationGroupId"
          name="translationGroupId"
          defaultValue={defaultValues?.translationGroupId ?? ""}
          className={controlClass}
        >
          <option value="">{t("fields.translationStandalone")}</option>
          {translationTargets.map((target) => (
            <option
              key={`${target.groupId}-${target.language}`}
              value={target.groupId}
            >
              {`${target.title} (${target.language.toUpperCase()})`}
            </option>
          ))}
        </select>
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
