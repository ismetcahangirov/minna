import { INDEXNOW_KEY } from "@/lib/seo/indexnow";

/**
 * The IndexNow key file.
 *
 * A search engine that receives a ping fetches this before trusting it: the
 * submission is only honoured if the key it carries is also served from the
 * host it claims to be submitting for. A route rather than a file in `public/`
 * so the key exists in one place — `@/lib/seo/indexnow` — instead of being
 * duplicated into a filename that nothing verifies.
 *
 * Root-level on purpose: the file's directory bounds which URLs the key can
 * vouch for, and only a root file covers the whole site.
 */
export const dynamic = "force-static";

export function GET(): Response {
  return new Response(INDEXNOW_KEY, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      // Verifiers refetch this on every submission; the key does not change.
      "Cache-Control": "public, max-age=0, s-maxage=86400",
    },
  });
}
