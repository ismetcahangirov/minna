"use client";

import { useActionState, useRef, useState, type RefObject } from "react";
import { ImagePlus, Link2, Trash2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  addBlogImageLinkAction,
  deleteBlogMediaAction,
  uploadBlogImageAction,
  type BlogMediaFormState,
  type BlogMediaItem,
} from "@/lib/admin/blog/media-actions";

import { imageSnippet, insertSnippet } from "./editor-insert";

const controlClass =
  "bg-input/30 border-border text-foreground placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-ring/50 w-full border px-3 py-2 text-sm outline-none focus-visible:ring-3";

interface BlogImagePanelProps {
  /** The body textarea an insert writes into. */
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  /** The library as the server last rendered it. */
  library: BlogMediaItem[];
}

/**
 * Image library for the post editor (ADMIN-05).
 *
 * Deliberately not a `<form>`: it lives inside the post form, and a nested form
 * is invalid HTML. Its inputs carry no `name`, so they are never submitted with
 * the post, and its two actions are dispatched with a hand-built `FormData`.
 *
 * Adding and inserting are separate steps. An image belongs to the library, not
 * to one post — that is what lets the same picture be reused across posts, and
 * what lets an editor drop one image into three different places in a body.
 */
export function BlogImagePanel({ textareaRef, library }: BlogImagePanelProps) {
  const t = useTranslations("admin.blogs.media");
  const [mode, setMode] = useState<"upload" | "link">("upload");
  const fileRef = useRef<HTMLInputElement>(null);
  const urlRef = useRef<HTMLInputElement>(null);
  const altRef = useRef<HTMLInputElement>(null);
  const captionRef = useRef<HTMLInputElement>(null);

  const [uploadState, upload, uploading] = useActionState<
    BlogMediaFormState,
    FormData
  >(uploadBlogImageAction, {});
  const [linkState, addLink, linking] = useActionState<
    BlogMediaFormState,
    FormData
  >(addBlogImageLinkAction, {});

  const state = mode === "upload" ? uploadState : linkState;
  const pending = mode === "upload" ? uploading : linking;

  /** Collects the shared description fields both actions accept. */
  function describedFormData(): FormData {
    const data = new FormData();
    data.set("alt", altRef.current?.value ?? "");
    data.set("caption", captionRef.current?.value ?? "");
    return data;
  }

  function submitUpload() {
    const file = fileRef.current?.files?.[0];
    const data = describedFormData();
    if (file) data.set("file", file);
    upload(data);
  }

  function submitLink() {
    const data = describedFormData();
    data.set("url", urlRef.current?.value ?? "");
    addLink(data);
  }

  function insert(image: BlogMediaItem) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    insertSnippet(textarea, {
      before: imageSnippet(image),
      block: true,
    });
  }

  // The freshly added image is offered straight away; the grid below refreshes
  // on its own once the action's revalidation lands.
  const added = state.added;

  return (
    <section
      aria-label={t("title")}
      className="border-border flex flex-col gap-4 border p-4"
    >
      <div>
        <p className="text-foreground inline-flex items-center gap-2 text-sm font-medium">
          <ImagePlus className="size-4" aria-hidden />
          {t("title")}
        </p>
        <p className="text-muted-foreground mt-1 text-xs">{t("hint")}</p>
      </div>

      <div className="flex gap-2">
        {(["upload", "link"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            aria-pressed={mode === value}
            className={`focus-visible:ring-ring inline-flex items-center gap-1.5 border px-3 py-1.5 text-xs font-medium tracking-wide uppercase transition-colors outline-none focus-visible:ring-2 ${
              mode === value
                ? "border-primary text-foreground"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {value === "upload" ? (
              <Upload className="size-3.5" aria-hidden />
            ) : (
              <Link2 className="size-3.5" aria-hidden />
            )}
            {value === "upload" ? t("upload") : t("fromLink")}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {mode === "upload" ? (
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
            aria-label={t("upload")}
            className={`${controlClass} file:border-border file:text-foreground file:mr-3 file:border file:bg-transparent file:px-2 file:py-1 file:text-xs`}
          />
        ) : (
          <input
            ref={urlRef}
            type="url"
            placeholder="https://"
            aria-label={t("urlLabel")}
            className={controlClass}
          />
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-muted-foreground text-xs font-medium">
              {t("altLabel")}
            </span>
            <input ref={altRef} type="text" className={controlClass} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-muted-foreground text-xs font-medium">
              {t("captionLabel")}
            </span>
            <input ref={captionRef} type="text" className={controlClass} />
          </label>
        </div>
        <p className="text-muted-foreground text-xs">{t("altHint")}</p>

        <div>
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={mode === "upload" ? submitUpload : submitLink}
          >
            {pending ? t("uploading") : t("add")}
          </Button>
        </div>

        {state.error && (
          <p className="text-destructive text-xs">
            {t(`errors.${state.error}`)}
          </p>
        )}

        {added && (
          <div className="border-primary flex items-center gap-3 border p-2">
            <MediaThumb image={added} />
            <span className="text-muted-foreground flex-1 truncate text-xs">
              {added.alt || added.url}
            </span>
            <Button type="button" size="sm" onClick={() => insert(added)}>
              {t("insert")}
            </Button>
          </div>
        )}
      </div>

      <div className="border-border border-t pt-4">
        {library.length === 0 ? (
          <p className="text-muted-foreground text-xs">{t("empty")}</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {library.map((image) => (
              <li
                key={image.id}
                className="border-border flex flex-col gap-2 border p-2"
              >
                <MediaThumb image={image} />
                <p className="text-muted-foreground truncate text-[11px]">
                  {image.alt || image.url}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="flex-1"
                    onClick={() => insert(image)}
                  >
                    {t("insert")}
                  </Button>
                  <button
                    type="button"
                    title={t("remove")}
                    aria-label={t("remove")}
                    onClick={() => {
                      if (confirm(t("confirmRemove"))) {
                        void deleteBlogMediaAction(image.id);
                      }
                    }}
                    className="text-muted-foreground hover:text-destructive focus-visible:ring-ring border-border border p-1.5 transition-colors outline-none focus-visible:ring-2"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/**
 * Library thumbnail. A plain `<img>` on purpose: a pasted link can point at any
 * host, and `next/image` answers 400 for hosts absent from `remotePatterns`,
 * which would break exactly the previews an editor needs to check a link by.
 * These are admin-only and never indexed, so the optimizer buys nothing here.
 */
function MediaThumb({ image }: { image: BlogMediaItem }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={image.url}
      alt={image.alt ?? ""}
      loading="lazy"
      decoding="async"
      className="border-border aspect-video w-full border object-cover"
    />
  );
}
