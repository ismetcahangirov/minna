/**
 * Cursor-level editing for the post body textarea (ADMIN-05).
 *
 * The textarea is deliberately uncontrolled: the form submits it as `FormData`,
 * so React never needs its value, and writing straight to the DOM keeps the
 * caret exactly where the editor left it. A controlled value would re-render
 * between the write and the selection restore and drop the caret to the end.
 */

export interface EditorSnippet {
  /** Text placed before the selection. */
  before: string;
  /** Text placed after the selection. Empty for a plain insertion. */
  after?: string;
  /** Used when nothing is selected, and left selected so it can be typed over. */
  placeholder?: string;
  /**
   * Whether the snippet is a block. Blocks are separated from their
   * surroundings by a blank line, so Markdown sees them as their own node
   * rather than folding them into the paragraph the cursor sat in.
   */
  block?: boolean;
}

/** Ensures `text` starts after a blank line, unless it already does. */
function padStart(before: string): string {
  if (before.length === 0) return "";
  if (before.endsWith("\n\n")) return "";
  return before.endsWith("\n") ? "\n" : "\n\n";
}

/** Ensures `text` is followed by a blank line, unless it already is. */
function padEnd(after: string): string {
  if (after.length === 0) return "\n";
  if (after.startsWith("\n\n")) return "";
  return after.startsWith("\n") ? "\n" : "\n\n";
}

/**
 * Writes a snippet into the textarea at the cursor, wrapping the selection when
 * there is one, and leaves the caret where the editor will keep typing.
 */
export function insertSnippet(
  textarea: HTMLTextAreaElement,
  snippet: EditorSnippet,
): void {
  const { value, selectionStart, selectionEnd } = textarea;
  const selected = value.slice(selectionStart, selectionEnd);
  const body = selected || snippet.placeholder || "";
  const after = snippet.after ?? "";

  const head = value.slice(0, selectionStart);
  const tail = value.slice(selectionEnd);
  let opening = snippet.before;
  let closing = after;

  if (snippet.block) {
    opening = `${padStart(head)}${snippet.before}`;
    closing = `${after}${padEnd(tail)}`;
  }

  const inserted = `${opening}${body}${closing}`;
  textarea.value = `${head}${inserted}${tail}`;

  // The body stays selected either way: a placeholder can be typed straight
  // over, and a wrapped selection stays visible so the editor sees what moved.
  const bodyStart = head.length + opening.length;
  textarea.focus();
  textarea.setSelectionRange(bodyStart, bodyStart + body.length);

  // Let anything listening (autosize, dirty tracking) see the change.
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}

/** Escapes text for an HTML attribute, so a quote in a caption cannot break out. */
function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Escapes text placed between tags. */
function escapeText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export interface InsertableImage {
  url: string;
  alt: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
}

/**
 * The body text for one image.
 *
 * An image whose intrinsic size is known is written as a `<figure>` carrying
 * `width`/`height`, so the browser reserves its box before the file arrives and
 * the article does not jump as images load — Markdown's image syntax has no way
 * to express that. Everything else falls back to Markdown, where the title
 * becomes the caption when the renderer lifts it into a figure.
 */
export function imageSnippet(image: InsertableImage): string {
  const alt = escapeAttribute(image.alt ?? "");
  const caption = image.caption?.trim();

  if (image.width && image.height) {
    const figcaption = caption
      ? `\n  <figcaption>${escapeText(caption)}</figcaption>`
      : "";
    return `<figure>\n  <img src="${escapeAttribute(image.url)}" alt="${alt}" width="${image.width}" height="${image.height}" loading="lazy" decoding="async">${figcaption}\n</figure>`;
  }

  const title = caption ? ` "${caption.replace(/"/g, "'")}"` : "";
  return `![${image.alt ?? ""}](${image.url}${title})`;
}
