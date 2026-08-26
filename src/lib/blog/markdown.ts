import "server-only";

import { cache } from "react";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { type Plugin, unified } from "unified";
import { SKIP, visit } from "unist-util-visit";
import type { Element, Nodes, Root } from "hast";

/**
 * A heading found in a post body, in document order — the table of contents on
 * the detail page and the `hasPart` sections of its JSON-LD.
 */
export interface BlogHeading {
  /** 2–6. A body never contains an h1: the page title owns that level. */
  level: number;
  /** Slug id written onto the heading, so `#id` deep-links to the section. */
  id: string;
  text: string;
}

/** An image embedded in the body, for the article's `image` array. */
export interface BlogBodyImage {
  src: string;
  alt: string;
  caption: string | null;
}

/** Everything the detail page and its structured data need from one body. */
export interface RenderedBlogContent {
  /** Sanitized semantic HTML, safe for `dangerouslySetInnerHTML`. */
  html: string;
  headings: BlogHeading[];
  images: BlogBodyImage[];
  /** The body as plain text — meta descriptions, excerpts, word count. */
  text: string;
  wordCount: number;
  /** Whole minutes, at least 1 — published as `timeRequired`. */
  readingMinutes: number;
}

/** Average adult reading speed; the figure Medium and Google both assume. */
const WORDS_PER_MINUTE = 200;

/**
 * What an editor may write, on top of GitHub's default whitelist.
 *
 * The default schema already permits the structural elements Markdown itself
 * produces (`section`, `details`, `dl`, `table`, `blockquote`, …). These are
 * the semantic elements an editor can only reach by writing the tag by hand,
 * plus the attributes that make a figure, an abbreviation or a machine-readable
 * date mean anything. Everything absent here — `script`, `style`, `iframe`,
 * every `on*` handler, inline `style` — is dropped, so raw HTML in a post can
 * enrich the markup but never execute.
 */
const SCHEMA: typeof defaultSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    "figure",
    "figcaption",
    "aside",
    "article",
    "header",
    "footer",
    "nav",
    "time",
    "mark",
    "abbr",
    "cite",
    "small",
    "caption",
    "colgroup",
    "col",
  ],
  attributes: {
    ...defaultSchema.attributes,
    // `datetime` is the whole point of `<time>` — without it the element is
    // decorative and crawlers learn nothing from it.
    time: [...(defaultSchema.attributes?.time ?? []), "dateTime"],
    abbr: [...(defaultSchema.attributes?.abbr ?? []), "title"],
    // `title` survives on images so a lone image can become a captioned figure
    // (see {@link liftImagesIntoFigures}); the loading/size hints keep the
    // browser from reflowing the article as body images arrive.
    img: [
      ...(defaultSchema.attributes?.img ?? []),
      "alt",
      "title",
      "loading",
      "decoding",
      "width",
      "height",
    ],
    // Outbound editorial links are opened safely; `rel`/`target` are written by
    // {@link markExternalLinks}, never taken from what the editor typed.
    a: [...(defaultSchema.attributes?.a ?? []), "rel", "target"],
    "*": [...(defaultSchema.attributes?.["*"] ?? []), "id", "lang", "dir"],
  },
};

/** Concatenated text of an element and everything inside it. */
function textOf(node: Nodes): string {
  if (node.type === "text") return node.value;
  if ("children" in node) return node.children.map(textOf).join("");
  return "";
}

/**
 * Shifts the body's headings so its shallowest one lands at `h2`.
 *
 * The page renders the post title as the document's only `h1`. A body that
 * opens with `#` would produce a second one and flatten the outline; a body
 * that opens with `###` would skip a level under the title. Normalising by the
 * shallowest heading present fixes both while preserving the relative depth the
 * editor actually wrote — `## / ###` stays two levels apart either way.
 */
const normalizeHeadingLevels: Plugin<[], Root> = () => {
  return (tree) => {
    const levels: number[] = [];
    visit(tree, "element", (node: Element) => {
      const match = /^h([1-6])$/.exec(node.tagName);
      if (match) levels.push(Number(match[1]));
    });
    if (levels.length === 0) return;

    const shift = 2 - Math.min(...levels);
    if (shift === 0) return;

    visit(tree, "element", (node: Element) => {
      const match = /^h([1-6])$/.exec(node.tagName);
      if (!match) return;
      const level = Math.min(6, Math.max(2, Number(match[1]) + shift));
      node.tagName = `h${level}`;
    });
  };
};

/**
 * Turns a paragraph holding nothing but an image into a `<figure>`, using the
 * Markdown title (`![alt](url "title")`) as its `<figcaption>`.
 *
 * This is what lets an editor drop an image between any two sections and have
 * it come out as a described, captioned figure rather than an image loose
 * inside a paragraph — the difference between an image search understands and
 * one it ignores.
 */
const liftImagesIntoFigures: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, "element", (node: Element) => {
      if (node.tagName !== "p") return;

      const children = node.children.filter(
        (child) => child.type !== "text" || child.value.trim() !== "",
      );
      const [only] = children;
      if (
        children.length !== 1 ||
        only.type !== "element" ||
        only.tagName !== "img"
      ) {
        return;
      }

      const caption = String(only.properties.title ?? "").trim();
      delete only.properties.title;
      // Body images are always below the fold — the cover is the LCP element.
      only.properties.loading = "lazy";
      only.properties.decoding = "async";

      node.tagName = "figure";
      node.children = caption
        ? [
            only,
            {
              type: "element",
              tagName: "figcaption",
              properties: {},
              children: [{ type: "text", value: caption }],
            },
          ]
        : [only];
    });
  };
};

/**
 * Opens off-site links in a new tab with `rel="noopener noreferrer"`. Outbound
 * editorial links are left followable on purpose: citing sources is a signal
 * worth sending, and blanket `nofollow` throws it away.
 */
const markExternalLinks: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, "element", (node: Element) => {
      if (node.tagName !== "a") return;
      const href = String(node.properties.href ?? "");
      if (!/^https?:\/\//i.test(href)) return;
      node.properties.target = "_blank";
      node.properties.rel = ["noopener", "noreferrer"];
    });
  };
};

/** Records headings and images while the tree is already being walked. */
function collect(into: {
  headings: BlogHeading[];
  images: BlogBodyImage[];
}): Plugin<[], Root> {
  return () => (tree) => {
    visit(tree, "element", (node: Element, _index, parent) => {
      const heading = /^h([2-6])$/.exec(node.tagName);
      if (heading) {
        const text = textOf(node).trim();
        const id = String(node.properties.id ?? "");
        if (text && id) {
          into.headings.push({ level: Number(heading[1]), id, text });
        }
        return;
      }

      if (node.tagName !== "img") return;
      const src = String(node.properties.src ?? "");
      if (!src) return;

      const caption =
        parent?.type === "element" && parent.tagName === "figure"
          ? (parent.children
              .filter(
                (child): child is Element =>
                  child.type === "element" && child.tagName === "figcaption",
              )
              .map((child) => textOf(child).trim())
              .find(Boolean) ?? null)
          : null;

      into.images.push({
        src,
        alt: String(node.properties.alt ?? ""),
        caption,
      });
    });
  };
}

/** Hands the finished body to `onText` as plain text, skipping code blocks. */
function capturePlainText(onText: (text: string) => void): Plugin<[], Root> {
  return () => (tree) => {
    onText(plainText(tree));
  };
}

/** Collects the body as plain text, skipping code blocks. */
function plainText(tree: Root): string {
  const parts: string[] = [];
  visit(tree, "element", (node: Element) => {
    if (node.tagName === "pre") return SKIP;
    if (!/^(p|li|h[2-6]|blockquote|figcaption|td|th|dd|dt)$/.test(node.tagName))
      return;
    const text = textOf(node).replace(/\s+/g, " ").trim();
    if (text) parts.push(text);
  });
  return parts.join(" ");
}

/**
 * Renders a post body (Markdown, optionally with hand-written semantic HTML)
 * into sanitized HTML plus everything the page's structured data needs.
 *
 * Memoized per request with React `cache`, because the detail page renders the
 * body and `generateMetadata` needs its plain text — one parse serves both.
 */
export const renderBlogMarkdown = cache(
  async (markdown: string): Promise<RenderedBlogContent> => {
    const collected = {
      headings: [] as BlogHeading[],
      images: [] as BlogBodyImage[],
    };
    let text = "";

    const file = await unified()
      .use(remarkParse)
      .use(remarkGfm)
      // Hand-written HTML is parsed rather than escaped, then whitelisted by
      // `rehypeSanitize` below — the order is what keeps this safe.
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRaw)
      .use(rehypeSanitize, SCHEMA)
      .use(normalizeHeadingLevels)
      .use(rehypeSlug)
      .use(liftImagesIntoFigures)
      .use(markExternalLinks)
      .use(collect(collected))
      .use(
        capturePlainText((value) => {
          text = value;
        }),
      )
      .use(rehypeStringify)
      .process(markdown);

    const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;

    return {
      html: String(file),
      headings: collected.headings,
      images: collected.images,
      text,
      wordCount,
      readingMinutes: Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE)),
    };
  },
);
