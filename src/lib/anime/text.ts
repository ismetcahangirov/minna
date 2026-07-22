/**
 * AniList descriptions (used across the hero, detail view and SEO metadata)
 * carry inline HTML such as `<br>` and `<i>`. Strips tags and collapses
 * whitespace so the text is safe to render and to place in meta tags.
 */
export function stripHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
