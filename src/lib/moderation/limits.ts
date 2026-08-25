/**
 * Length bounds for every member-written field in the community features.
 *
 * Deliberately free of the `server-only` marker the rest of the moderation
 * layer carries: the forms need these numbers for their `maxLength` attributes,
 * so a member is stopped at the field instead of by a round-trip. The server
 * re-checks them regardless — the browser's copy is a courtesy, never the gate.
 *
 * The cap is as much a database concern as an editorial one: it is what keeps a
 * free-tier row from growing without bound.
 */
export const TEXT_LIMITS = {
  threadTitle: { min: 4, max: 120 },
  threadBody: { min: 0, max: 4000 },
  post: { min: 2, max: 2000 },
} as const;
