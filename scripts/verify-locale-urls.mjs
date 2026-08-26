#!/usr/bin/env node
// @ts-check
/**
 * Locale-routing verification (EPIC-18 — I18N-06 / I18N-08).
 *
 * Moving the locale into the URL touched every route at once, so the check
 * that nothing already indexed broke is part of the work rather than an
 * afterthought. This walks a deployment and asserts, for every URL:
 *
 *  1. **Nothing 404s.** Every URL in the sitemap resolves, and so does every
 *     URL from the *previous* sitemap when one is supplied — that is the list
 *     Google already holds, and it is enumerated in full, never sampled.
 *  2. **No redirect chains.** A legacy URL may move, but in one hop. A chain
 *     spends crawl budget and dilutes the signal it was meant to pass on.
 *  3. **hreflang is reciprocal and agrees with the sitemap.** Every alternate a
 *     page names must name the page back, all members of a set must declare the
 *     same `x-default`, and the set in the page's head must match the one the
 *     sitemap claims — Google reads them as a single claim and ignores the lot
 *     when they disagree.
 *  4. **The locale is decided by the URL, not by a cookie.** Each page is
 *     fetched with no cookie and with a contradicting `NEXT_LOCALE`; the
 *     `<html lang>` and canonical must be identical both times. This is the
 *     regression the whole epic exists to prevent.
 *  5. **The canonical is self-referential per locale** — never pointing at
 *     another language's URL, which would ask Google to drop that language.
 *
 *   node scripts/verify-locale-urls.mjs --base=https://minna-six.vercel.app
 *   npm run verify:locale -- --base=… --previous=./old-sitemap.xml --limit=200
 *
 * Flags:
 *   --base=URL        deployment to check      (default NEXT_PUBLIC_SITE_URL)
 *   --previous=PATH   a saved copy of the production sitemap.xml from before
 *                     this change, so its URLs can be replayed for 404s
 *   --limit=N         cap URLs checked per group; 0 = no cap    (default 150)
 *   --concurrency=N   parallel requests                          (default 8)
 *
 * Run it against a deployed preview, not `next dev`: server-component
 * redirects answer 200 rather than 308 on a direct GET in local dev, so a
 * canonical redirect that is fine in production looks broken locally.
 */
import { readFile } from "node:fs/promises";

import { config } from "dotenv";

config({ path: ".env.local" });
config();

const LOCALES = ["en", "tr", "ru"];

function parseArgs(argv) {
  const opts = {
    base: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    previous: null,
    limit: 150,
    concurrency: 8,
  };
  for (const arg of argv.slice(2)) {
    const [key, value] = arg.replace(/^--/, "").split("=");
    if (key === "base") opts.base = value;
    else if (key === "previous") opts.previous = value;
    else if (key === "limit") opts.limit = Number(value);
    else if (key === "concurrency") opts.concurrency = Number(value);
  }
  opts.base = opts.base.replace(/\/+$/, "");
  return opts;
}

/**
 * Rewrites a URL onto the deployment being checked.
 *
 * `NEXT_PUBLIC_SITE_URL` is baked into every absolute URL the app emits, so a
 * preview deployment — or a local `next start` — advertises production URLs in
 * its own sitemap and canonicals. Without this the script would quietly walk
 * production while claiming to verify the preview.
 */
function toBase(url, base) {
  const onBase = url.replace(/^https?:\/\/[^/]+/, base);
  // `https://site` and `https://site/` are the same URL — an empty path is `/`
  // per RFC 3986 — but Next writes the first form in a canonical and the second
  // in `sitemap.xml`, so they are normalised before anything is compared.
  return onBase === base ? `${base}/` : onBase;
}

/* ------------------------------------------------------------------ report */

const failures = [];
const notes = [];
let checked = 0;

function fail(url, message) {
  failures.push({ url, message });
}

/* ----------------------------------------------------------------- fetching */

/** A single request that never follows redirects, so hops stay countable. */
async function head(url, { cookie } = {}) {
  const response = await fetch(url, {
    redirect: "manual",
    headers: {
      "user-agent": "minna-locale-verifier",
      // No `accept-language`: a crawler sends none, and the default locale is
      // exactly what it should get on an unprefixed URL.
      ...(cookie ? { cookie } : {}),
    },
  });
  const body = response.status < 300 ? await response.text() : "";
  return {
    status: response.status,
    location: response.headers.get("location"),
    body,
  };
}

/** Runs `worker` over `items` with a bounded number in flight. */
async function pooled(items, concurrency, worker) {
  const queue = [...items];
  const runners = Array.from(
    { length: Math.min(concurrency, queue.length) },
    async () => {
      for (let item = queue.shift(); item; item = queue.shift()) {
        await worker(item);
      }
    },
  );
  await Promise.all(runners);
}

/* ------------------------------------------------------------------ parsing */

/**
 * Reads an attribute out of a raw tag, case-insensitively — Next's metadata
 * renders `hrefLang`, the React prop name, not the lowercase HTML attribute.
 */
function attr(tag, name) {
  const match = new RegExp(`${name}="([^"]*)"`, "i").exec(tag);
  return match ? match[1] : null;
}

/** `<link rel="alternate" hreflang="…" href="…">` pairs from a rendered page. */
function pageAlternates(html) {
  const found = {};
  const links = html.match(/<link[^>]+rel="alternate"[^>]*>/gi) ?? [];
  for (const tag of links) {
    const lang = attr(tag, "hreflang");
    const href = attr(tag, "href");
    if (lang && href) found[lang] = href;
  }
  return found;
}

function canonicalOf(html) {
  const tag = /<link[^>]+rel="canonical"[^>]*>/i.exec(html);
  return tag ? attr(tag[0], "href") : null;
}

function htmlLang(html) {
  const match = /<html[^>]+lang="([^"]+)"/.exec(html);
  return match ? match[1] : null;
}

/** `<url>` blocks from a sitemap, with their `xhtml:link` alternates. */
function parseSitemap(xml) {
  const entries = [];
  for (const block of xml.match(/<url>[\s\S]*?<\/url>/g) ?? []) {
    const loc = /<loc>([^<]+)<\/loc>/.exec(block)?.[1];
    if (!loc) continue;
    const alternates = {};
    for (const tag of block.match(/<xhtml:link[^>]*>/g) ?? []) {
      const lang = attr(tag, "hreflang");
      const href = attr(tag, "href");
      if (lang && href) alternates[lang] = href;
    }
    entries.push({ loc, alternates });
  }
  return entries;
}

/* ------------------------------------------------------------------- checks */

/**
 * Follows a URL to its destination, allowing at most one hop.
 * Returns the final page, or null when the URL is broken.
 */
async function resolveOnce(url) {
  const first = await head(url);
  checked += 1;

  if (first.status === 404) {
    fail(url, "404 — a URL that used to resolve no longer does");
    return null;
  }
  if (first.status < 300) return { url, ...first };

  if (!first.location) {
    fail(url, `${first.status} with no Location header`);
    return null;
  }

  const target = new URL(first.location, url).toString();
  const second = await head(target);
  checked += 1;

  if (second.status >= 300 && second.status < 400) {
    fail(url, `redirect chain: ${url} → ${target} → ${second.location}`);
    return null;
  }
  if (second.status >= 400) {
    fail(url, `${first.status} → ${target} which answers ${second.status}`);
    return null;
  }
  return { url: target, ...second };
}

/**
 * The core regression guard: one URL must mean one language.
 *
 * Each page is fetched again with a `NEXT_LOCALE` cookie for a *different*
 * language. What must never happen is the same URL rendering a second language
 * — that is what made the old setup unindexable, and what any shared cache in
 * front of the app would have served to the wrong visitor.
 *
 * A redirect is a different matter and is expected on the unprefixed URLs:
 * under `as-needed` those are both the English addresses and the "no locale
 * stated yet" addresses, so a returning Turkish visitor is sent to `/tr/…`
 * rather than being shown English. The bargain only holds if it is one-way — a
 * URL that already names its locale must not move for any cookie.
 */
async function checkCookieIndependence(page, base) {
  const lang = htmlLang(page.body);
  const canonical = toBase(canonicalOf(page.body) ?? "", base);
  const other = LOCALES.find((locale) => locale !== lang) ?? "ru";
  const { pathname } = new URL(page.url);
  const prefixed = LOCALES.includes(pathname.split("/")[1]);

  const withCookie = await head(page.url, { cookie: `NEXT_LOCALE=${other}` });
  checked += 1;

  if (withCookie.status >= 300 && withCookie.status < 400) {
    if (prefixed) {
      fail(
        page.url,
        `a URL that already names its locale moved for NEXT_LOCALE=${other} — the cookie is still deciding`,
      );
      return;
    }
    const target = new URL(withCookie.location ?? "", page.url).pathname;
    const expected = pathname === "/" ? `/${other}` : `/${other}${pathname}`;
    if (target !== expected) {
      fail(
        page.url,
        `NEXT_LOCALE=${other} sends it to ${target}, not the same page at ${expected}`,
      );
    }
    return;
  }

  if (withCookie.status >= 400) {
    fail(page.url, `answers ${withCookie.status} with NEXT_LOCALE=${other}`);
    return;
  }
  if (htmlLang(withCookie.body) !== lang) {
    fail(
      page.url,
      `renders ${htmlLang(withCookie.body)} with NEXT_LOCALE=${other} but ${lang} without — one URL, two languages`,
    );
  }
  if (toBase(canonicalOf(withCookie.body) ?? "", base) !== canonical) {
    fail(page.url, "canonical changes when a locale cookie is sent");
  }
}

/** Canonical, `hreflang` reciprocity and `x-default` agreement for one page. */
async function checkAlternates(page, sitemapAlternates, base) {
  const declared = canonicalOf(page.body);
  if (!declared) {
    fail(page.url, "no canonical link");
    return;
  }
  const canonical = toBase(declared, base);
  if (new URL(canonical).pathname !== new URL(page.url).pathname) {
    fail(page.url, `canonical points elsewhere: ${declared}`);
  }

  const alternates = Object.fromEntries(
    Object.entries(pageAlternates(page.body)).map(([lang, href]) => [
      lang,
      toBase(href, base),
    ]),
  );
  const languages = Object.keys(alternates).filter((l) => l !== "x-default");
  if (languages.length === 0) return; // noindex page, or an untranslated post

  if (!alternates["x-default"]) {
    fail(page.url, "hreflang set with no x-default");
  }
  if (!Object.values(alternates).includes(canonical)) {
    fail(page.url, "hreflang set does not include the page's own canonical");
  }

  if (sitemapAlternates && Object.keys(sitemapAlternates).length > 0) {
    const pageSet = JSON.stringify(
      Object.fromEntries(Object.entries(alternates).sort()),
    );
    const mapSet = JSON.stringify(
      Object.fromEntries(Object.entries(sitemapAlternates).sort()),
    );
    if (pageSet !== mapSet) {
      fail(page.url, "page hreflang and sitemap alternates disagree");
    }
  }

  // Reciprocity: each named alternate must name this page back, with the same
  // x-default. A one-way set is the failure Google answers by ignoring it.
  for (const [lang, href] of Object.entries(alternates)) {
    if (lang === "x-default" || href === canonical) continue;

    const sibling = await resolveOnce(href);
    if (!sibling) continue;

    const siblingSet = Object.fromEntries(
      Object.entries(pageAlternates(sibling.body)).map(([lang, href]) => [
        lang,
        toBase(href, base),
      ]),
    );
    if (!Object.values(siblingSet).includes(canonical)) {
      fail(
        href,
        `does not link back to ${canonical} (hreflang not reciprocal)`,
      );
    }
    if (siblingSet["x-default"] !== alternates["x-default"]) {
      fail(
        href,
        `x-default is ${siblingSet["x-default"]}, but ${canonical} says ${alternates["x-default"]}`,
      );
    }
  }
}

/* --------------------------------------------------------------------- main */

async function main() {
  const opts = parseArgs(process.argv);
  console.log(`Verifying ${opts.base}\n`);

  const sitemapUrl = `${opts.base}/sitemap.xml`;
  const sitemapResponse = await fetch(sitemapUrl);
  if (!sitemapResponse.ok) {
    console.error(`sitemap.xml answered ${sitemapResponse.status}`);
    process.exit(1);
  }
  const entries = parseSitemap(await sitemapResponse.text()).map((entry) => ({
    loc: toBase(entry.loc, opts.base),
    alternates: Object.fromEntries(
      Object.entries(entry.alternates).map(([lang, href]) => [
        lang,
        toBase(href, opts.base),
      ]),
    ),
  }));
  console.log(`sitemap.xml: ${entries.length} URLs`);

  const byLocale = Object.fromEntries(LOCALES.map((l) => [l, 0]));
  for (const { loc } of entries) {
    const [, first] = new URL(loc).pathname.split("/");
    byLocale[LOCALES.includes(first) ? first : "en"] += 1;
  }
  console.log(
    `  per locale: ${LOCALES.map((l) => `${l}=${byLocale[l]}`).join("  ")}`,
  );
  for (const locale of LOCALES) {
    if (byLocale[locale] === 0) {
      fail(sitemapUrl, `no ${locale} URLs in the sitemap`);
    }
  }

  const sample = opts.limit > 0 ? entries.slice(0, opts.limit) : entries;
  if (sample.length < entries.length) {
    // Never let a cap look like full coverage.
    notes.push(
      `checked ${sample.length} of ${entries.length} sitemap URLs (--limit=${opts.limit}); use --limit=0 for all`,
    );
  }

  console.log(`\nChecking ${sample.length} sitemap URLs…`);
  await pooled(sample, opts.concurrency, async (entry) => {
    const page = await resolveOnce(entry.loc);
    if (!page) return;
    if (page.url !== entry.loc) {
      fail(entry.loc, `sitemap URL redirects to ${page.url} — list the target`);
    }
    await checkAlternates(page, entry.alternates, opts.base);
    await checkCookieIndependence(page, opts.base);
  });

  if (opts.previous) {
    const previous = parseSitemap(await readFile(opts.previous, "utf8"));
    const legacy = previous.map((entry) =>
      entry.loc.replace(/^https?:\/\/[^/]+/, opts.base),
    );
    console.log(`\nReplaying ${legacy.length} previously indexed URLs…`);
    await pooled(legacy, opts.concurrency, async (url) => {
      await resolveOnce(url);
    });
  } else {
    notes.push(
      "no --previous sitemap given: the already-indexed URL list was not replayed",
    );
  }

  console.log(`\n${checked} requests made.`);
  for (const note of notes) console.log(`NOTE  ${note}`);

  if (failures.length === 0) {
    console.log(
      "\nPASS — no 404s, no redirect chains, no cookie-varied pages.",
    );
    return;
  }
  console.log(`\nFAIL — ${failures.length} problem(s):\n`);
  for (const { url, message } of failures)
    console.log(`  ${url}\n    ${message}`);
  process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
