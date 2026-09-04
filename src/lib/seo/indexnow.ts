import "server-only";

import { absoluteUrl, getSiteUrl } from "@/lib/seo/site";

/**
 * IndexNow — telling search engines a URL changed, rather than waiting to be
 * crawled.
 *
 * A sitemap says "here is everything, come back whenever"; this says "this one
 * page changed, now". Bing, Yandex, Seznam and Naver consume it through one
 * shared endpoint. Google does not participate, so this complements the
 * sitemap rather than replacing it.
 *
 * ## Where it is used, and where it deliberately is not
 *
 * Only for events the site actually owns: a post published, edited, unpublished
 * or deleted. The anime catalog is not pushed — it comes from AniList on demand
 * and has no "changed" event to hang a ping on, and pushing thousands of
 * derived pages is how a site spends its crawl budget looking like a spammer.
 * The catalog is what the sitemap is for.
 *
 * A removed URL is worth submitting too: a submitted 404 is how an engine
 * learns to drop a page, which is faster than waiting for a recrawl.
 */

/**
 * This site's IndexNow key.
 *
 * Public by design — it travels in every ping and is served at
 * {@link INDEXNOW_KEY_PATH}. It proves nothing except that whoever pings also
 * controls this host, so committing it is safe and keeps the key and the file
 * that publishes it from drifting apart across environments.
 */
export const INDEXNOW_KEY = "33e4d1227f1495e97b97dee87bb2e5b3";

/**
 * Where the key file is served.
 *
 * The spec's default is a root file named after the key itself. This uses the
 * `keyLocation` form instead so the key lives in exactly one place — this
 * constant — with the route reading it, rather than being duplicated into a
 * filename that nothing checks. It stays at the root because the file's
 * directory bounds which URLs the key can vouch for: at the root it covers the
 * whole site, while `/some/path/key.txt` would only cover `/some/path/`.
 */
export const INDEXNOW_KEY_PATH = "/indexnow-key.txt";

/** The absolute URL of the key file, as `keyLocation` must carry it. */
export function indexNowKeyLocation(): string {
  return absoluteUrl(INDEXNOW_KEY_PATH);
}

/** The shared endpoint, which fans a submission out to every participant. */
const ENDPOINT = "https://api.indexnow.org/indexnow";

/** Long enough for a slow accept, short enough not to hold an admin action. */
const TIMEOUT_MS = 5000;

/**
 * Submits root-relative paths as changed.
 *
 * Never throws and never fails its caller: a search engine declining a ping is
 * not a reason for a post to fail to save. The sitemap still carries every URL,
 * so a missed ping costs latency to discovery, nothing more.
 */
export async function pingIndexNow(paths: readonly string[]): Promise<void> {
  // Production only. Preview deployments are behind Vercel's SSO gate, so
  // submitting their URLs would hand search engines a list of pages that answer
  // 401 — and every one of them under a hostname that is not the real site.
  if (process.env.VERCEL_ENV !== "production") return;

  const urlList = [...new Set(paths)].map(absoluteUrl);
  if (urlList.length === 0) return;

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: new URL(getSiteUrl()).host,
        key: INDEXNOW_KEY,
        keyLocation: indexNowKeyLocation(),
        urlList,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    // 200 is accepted, 202 is accepted-pending-key-validation. Everything else
    // is worth a line in the log: 403 means the key file is not being served,
    // 422 that a URL does not belong to this host — both are misconfigurations
    // that would otherwise fail silently forever.
    if (!response.ok) {
      console.error(
        `[indexnow] ${response.status} for ${urlList.length} url(s)`,
      );
    }
  } catch (error) {
    console.error("[indexnow] submit failed:", (error as Error).message);
  }
}
