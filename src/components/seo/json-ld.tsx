/** A schema.org node (or a list of them) rendered as JSON-LD. */
export type JsonLdData =
  Record<string, unknown> | ReadonlyArray<Record<string, unknown>>;

/**
 * Renders a JSON-LD structured-data block (PERF-01). Server component — the
 * script ships in the initial HTML so crawlers see it without executing JS.
 *
 * `<` is escaped to `<` so a title/description containing markup can never
 * break out of the script element (the standard JSON-LD injection guard).
 */
export function JsonLd({ data }: { data: JsonLdData }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
