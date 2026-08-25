import "server-only";

import {
  ALLOWED_TERMS,
  BOUNDED_TERMS,
  COMPACT_TERMS,
} from "@/lib/moderation/words";

/**
 * Profanity gate for every member-written text in the community features
 * (COMM-05): community threads, replies and episode reviews all pass through
 * {@link containsProfanity} before anything is written, so blocked text never
 * reaches the database.
 *
 * Two passes, deliberately different in strictness:
 *
 * 1. A word-boundary pass over the *folded* text (case, diacritics, Turkish /
 *    Azerbaijani letters and leet digits normalized). This carries the whole
 *    vocabulary, including short entries, and cannot fire inside a longer
 *    innocent word.
 * 2. A substring pass over the *compacted* text (separators and repeats
 *    removed), which defeats "f.u.c.k", "f u c k" and "fuuuck". Only long,
 *    unambiguous stems take part, and known-innocent words that happen to
 *    contain one are blanked out first.
 */

/** Digits and symbols commonly substituted for letters. */
const LEET: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "8": "b",
  "@": "a",
  $: "s",
  "!": "i",
  "|": "i",
};

/** Letters with no Unicode decomposition that still need folding. */
const LETTER_FOLD: Record<string, string> = {
  ı: "i",
  ə: "e",
  ø: "o",
  æ: "ae",
  ß: "ss",
  đ: "d",
  ð: "d",
  þ: "t",
};

/**
 * Cyrillic characters that read as Latin ones, so a Latin insult typed with a
 * Cyrillic "с" or "о" is still caught. Applied as a *second* view of the text —
 * the folded original is kept as well, because mapping these away would break
 * the Russian entries.
 */
const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: "a",
  в: "b",
  е: "e",
  ё: "e",
  к: "k",
  м: "m",
  н: "h",
  о: "o",
  р: "p",
  с: "c",
  т: "t",
  у: "y",
  х: "x",
  і: "i",
  ѕ: "s",
  ј: "j",
};

/**
 * Lowercases, strips diacritics, folds the letters Unicode does not decompose
 * and rewrites leet substitutions — the shared shape both the vocabulary and
 * the incoming text are compared in.
 */
function fold(input: string): string {
  const lowered = input
    .toLowerCase()
    .normalize("NFKD")
    // Combining marks left behind by the decomposition (ş → s, ğ → g, …).
    .replace(/\p{M}+/gu, "");

  let out = "";
  for (const char of lowered) {
    out += LETTER_FOLD[char] ?? LEET[char] ?? char;
  }
  return out;
}

/** The folded text with Cyrillic look-alikes rewritten as Latin letters. */
function latinize(folded: string): string {
  let out = "";
  for (const char of folded) {
    out += CYRILLIC_TO_LATIN[char] ?? char;
  }
  return out;
}

/** Drops everything that is not a letter and collapses repeated letters. */
function compact(folded: string): string {
  return folded.replace(/[^\p{L}]+/gu, "").replace(/(.)\1+/gu, "$1");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * One regex for the whole bounded vocabulary. The boundaries are written as
 * Unicode look-arounds rather than `\b`, which only knows ASCII word
 * characters and would never fire on the Cyrillic entries.
 */
const boundedPattern = new RegExp(
  `(?<![\\p{L}\\p{N}])(?:${BOUNDED_TERMS.map((term) =>
    escapeRegExp(fold(term)),
  ).join("|")})(?![\\p{L}\\p{N}])`,
  "u",
);

const compactTerms = COMPACT_TERMS.map((term) => compact(fold(term))).filter(
  (term) => term.length > 0,
);

const allowedCompactTerms = ALLOWED_TERMS.map((term) =>
  compact(fold(term)),
).filter((term) => term.length > 0);

/**
 * Whether the text carries profanity in any of the supported languages.
 *
 * Returns false for empty input, so callers can run it before their own
 * emptiness check without special-casing.
 */
export function containsProfanity(text: string): boolean {
  if (!text) return false;

  const folded = fold(text);
  if (boundedPattern.test(folded)) return true;

  const latin = latinize(folded);
  if (latin !== folded && boundedPattern.test(latin)) return true;

  // Both views are compacted: the Latin one so a Cyrillic look-alike inside an
  // English insult is caught, the folded one because latinizing would break a
  // Russian stem apart (е → e turns "пиздец" into a mixed-script word).
  const views = latin === folded ? [folded] : [folded, latin];

  return views.some((view) => {
    // Blank the innocent words first so their letters cannot form a stem.
    let compacted = compact(view);
    for (const allowed of allowedCompactTerms) {
      compacted = compacted.split(allowed).join(" ");
    }
    return compactTerms.some((term) => compacted.includes(term));
  });
}
