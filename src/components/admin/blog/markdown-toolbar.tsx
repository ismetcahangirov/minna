"use client";

import type { RefObject } from "react";
import {
  Bold,
  Code,
  Heading2,
  Heading3,
  Highlighter,
  Info,
  Italic,
  Link2,
  List,
  ListOrdered,
  ListTree,
  Quote,
  Table,
  Timer,
  Type,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { insertSnippet, type EditorSnippet } from "./editor-insert";

interface ToolbarButton {
  /** Key under `admin.blogs.toolbar.*`, also the accessible label. */
  key: string;
  icon: React.ComponentType<{ className?: string }>;
  snippet: EditorSnippet;
}

/**
 * What an editor can reach without knowing Markdown or HTML by heart.
 *
 * The first group is ordinary prose structure. The second is the semantic
 * markup Markdown has no syntax for — a pull-out note, a collapsible block, a
 * machine-readable date, an expanded abbreviation — written as HTML, which the
 * renderer's whitelist accepts and everything dangerous is stripped from.
 */
const BUTTONS: ToolbarButton[] = [
  {
    key: "heading2",
    icon: Heading2,
    snippet: { before: "## ", placeholder: "Section title", block: true },
  },
  {
    key: "heading3",
    icon: Heading3,
    snippet: { before: "### ", placeholder: "Subsection title", block: true },
  },
  {
    key: "bold",
    icon: Bold,
    snippet: { before: "**", after: "**", placeholder: "bold text" },
  },
  {
    key: "italic",
    icon: Italic,
    snippet: { before: "_", after: "_", placeholder: "italic text" },
  },
  {
    key: "link",
    icon: Link2,
    snippet: { before: "[", after: "](https://)", placeholder: "link text" },
  },
  {
    key: "bulletList",
    icon: List,
    snippet: { before: "- ", placeholder: "First item", block: true },
  },
  {
    key: "numberedList",
    icon: ListOrdered,
    snippet: { before: "1. ", placeholder: "First item", block: true },
  },
  {
    key: "quote",
    icon: Quote,
    snippet: { before: "> ", placeholder: "Quoted line", block: true },
  },
  {
    key: "code",
    icon: Code,
    snippet: { before: "`", after: "`", placeholder: "code" },
  },
  {
    key: "table",
    icon: Table,
    snippet: {
      before: "| ",
      after: " | Column |\n| --- | --- |\n| Value | Value |",
      placeholder: "Column",
      block: true,
    },
  },
  {
    key: "note",
    icon: Info,
    snippet: {
      before: "<aside>\n\n",
      after: "\n\n</aside>",
      placeholder: "A note beside the argument.",
      block: true,
    },
  },
  {
    key: "details",
    icon: ListTree,
    snippet: {
      before: "<details>\n<summary>Read more</summary>\n\n",
      after: "\n\n</details>",
      placeholder: "Hidden until opened.",
      block: true,
    },
  },
  {
    key: "time",
    icon: Timer,
    snippet: {
      before: '<time datetime="2026-01-01">',
      after: "</time>",
      placeholder: "1 January 2026",
    },
  },
  {
    key: "abbreviation",
    icon: Type,
    snippet: {
      before: '<abbr title="What it stands for">',
      after: "</abbr>",
      placeholder: "ABBR",
    },
  },
  {
    key: "highlight",
    icon: Highlighter,
    snippet: {
      before: "<mark>",
      after: "</mark>",
      placeholder: "highlighted",
    },
  },
];

interface MarkdownToolbarProps {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}

/**
 * Formatting bar over the post body (ADMIN-05). Every button writes text at the
 * cursor — nothing here is a hidden state the body does not show, so an editor
 * can always see and correct exactly what was inserted.
 */
export function MarkdownToolbar({ textareaRef }: MarkdownToolbarProps) {
  const t = useTranslations("admin.blogs.toolbar");

  return (
    <div
      role="toolbar"
      aria-label={t("label")}
      className="border-border bg-input/20 flex flex-wrap gap-1 border border-b-0 p-1.5"
    >
      {BUTTONS.map(({ key, icon: Icon, snippet }) => (
        <button
          key={key}
          type="button"
          title={t(key)}
          aria-label={t(key)}
          onClick={() => {
            const textarea = textareaRef.current;
            if (textarea) insertSnippet(textarea, snippet);
          }}
          className="text-muted-foreground hover:border-primary hover:text-foreground focus-visible:ring-ring border border-transparent p-1.5 transition-colors outline-none focus-visible:ring-2"
        >
          <Icon className="size-4" />
        </button>
      ))}
    </div>
  );
}
