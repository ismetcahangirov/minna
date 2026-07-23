# Anime Detail: Seasons, Parallax & SEO — Design

Date: 2026-07-23
Branch: `feat/anime-seasons-parallax-seo`

## Goal

Four related improvements centered on the anime detail page and its
discoverability:

1. **Hide episode-less anime** from listing pages.
2. **Season-aware episode rendering** with a season switcher on the detail page.
3. **Parallax banner** background on the detail page.
4. **SEO**: slug-based URLs, a sitemap that enumerates anime pages, and
   structured data (JSON-LD).

## Data reality (established from the code)

- Episodes on Vercel are **synthesized `1..N`** from `currentEpisode ?? totalEpisodes`
  (`src/lib/anime/detail.ts` `ensureEpisodes`) because the streaming scraper is
  IP-blocked. An anime therefore shows "no episodes" exactly when both counts are
  null/0.
- Episodes are **flat, no season field**. AniList models seasons as **separate
  anime entries** linked via `relations` (`relationType` `PREQUEL`/`SEQUEL`/…).
  `IAnimeInfo.relations` is returned by `fetchAnilistInfoById` in a single call
  but is currently discarded.
- Anime ids are **AniList numeric ids stored as strings** (`"140960"`). The watch
  route, the MegaPlay embed, and the `favorites`/`watch_progress` DB rows all key
  on this numeric id — it must remain resolvable from any anime URL.
- i18n is **cookie-based (no URL locale prefix)** → single canonical per anime,
  no hreflang needed.

## 1. Hide episode-less anime

In the `toAnimeSummary(...).filter(...)` chains of `catalog.ts`, `search.ts`,
`browse.ts`, drop entries where **both** `totalEpisodes` and `currentEpisode`
are null-or-≤0. This mirrors exactly what makes the detail page show "no
episodes", so lists and detail stay consistent. No extra fetches.

Shared predicate: `hasPlayableEpisodes(summary)` in `src/lib/anime/episodes.ts`
(or colocated), reused by all three call sites.

## 2. Seasons (navigation-based, fully SSR)

- Extend `ConsumetInfoResponse` with `relations` and `format`; narrow into
  `AnimeDetail.relations: AnimeRelation[]` and `AnimeDetail.format: string | null`.
  `AnimeRelation = { id, title, format, relationType, image }`.
- New server module `src/lib/anime/seasons.ts`:
  - `getAnimeSeasons(detail): Promise<AnimeSeason[]>` — walks the PREQUEL chain
    backward to the root, then the SEQUEL chain forward, using a **metadata-only**
    fetch (`fetchAnimeMeta(id)` — `fetchAnilistInfoById` without the episode
    scrape). Bounded to `MAX_SEASON_HOPS = 12` to avoid runaway/cyclic chains
    (guard with a visited set). Only anime media formats (TV/TV_SHORT/ONA/OVA/
    SPECIAL/MOVIE) are followed; MANGA/NOVEL/MUSIC relations are ignored.
  - Result is Redis-cached under `anime:seasons:{rootId}` (long TTL) and
    React-`cache()`-wrapped.
  - `AnimeSeason = { id, title, label, format, episodeCount, isCurrent }` where
    `label` is a display string (e.g. "Season 1", "OVA", "Movie") derived from
    order + format.
  - Side-story/special relations are appended after the main chain, grouped, not
    numbered as "Season N".
- UI: `src/components/anime/season-tabs.tsx` — **server component** rendering a
  horizontal strip of `<Link href={animeHref(season.id, season.title)}>` tabs,
  current one visually active (design-system tokens: black bg, `#E50914`
  accent for active, hard corners, no gradient/glass). Rendered above
  `EpisodeList` in `AnimeDetailView`. Hidden when only one season exists.
- "Episodes render by season" = each season is its own detail page rendering its
  own episode list (already true); the tab strip is the switcher/filter. No
  client JS, strong internal link graph between seasons.

## 3. Parallax banner

- Extract the banner into `src/components/anime/parallax-banner.tsx` (`"use client"`).
- Framer Motion `useScroll` + `useTransform` to translate the background image on
  scroll (subtle, ~15% travel). `next/image` with `priority` (LCP-safe — the image
  is already the priority hero; parallax is a transform on the loaded image).
- Respect `prefers-reduced-motion`: no transform when reduced motion is set.
- Must not introduce CLS: fixed aspect container, image `fill`.

## 4. SEO

### URL scheme

- Route folder stays `src/app/anime/[id]`. The `[id]` segment now accepts either
  `{id}` or `{id}-{slug}`. A helper `parseAnimeParam(param)` extracts the leading
  digits as the AniList id; the trailing text is ignored for lookup.
- Canonical form is `{id}-{slug}` where `slug = slugify(title)`.
- `animeHref(id, title)` in `src/lib/anime/href.ts` builds canonical URLs; used by
  all internal links (AnimeCard, poster card, favorite card, hero carousel ×2,
  watch back-link, season tabs).
- The detail page **301-redirects** a non-canonical param (bare id, or wrong/stale
  slug) to the canonical `{id}-{slug}` once the title is known
  (`redirect(animeHref(id, title))`). Preserves old links and consolidates SEO.
- `slugify` reused/added in `src/lib/anime/href.ts` (romaji-friendly: lowercase,
  strip diacritics, `[^a-z0-9]+ → -`, trim; fallback to `anime` when empty for
  CJK-only titles so the id still resolves).

### Watch route

- `/watch/[animeId]/[episodeId]` `animeId` stays numeric; if a slugged value ever
  arrives, `parseAnimeParam` extracts the id. Internal watch links keep using the
  raw numeric id (embed player requires it) — no slug needed there.

### Sitemap (`src/app/sitemap.ts`)

- Add anime entries: page through the popular feed (`advancedSearch`
  `POPULARITY_DESC`) up to `SITEMAP_ANIME_PAGES` (≈20 pages × 50 = ~1000),
  building canonical `{id}-{slug}` URLs (feed returns titles). Union with distinct
  `animeId`s from `favorites` + `watch_progress` (title looked up only if cheap;
  otherwise emit `/anime/{id}` which 301s — acceptable but prefer feed titles).
  Dedupe by id. `log`/comment the cap so coverage isn't silently truncated.
  Hourly `revalidate` (existing).

### Structured data (JSON-LD)

- `src/components/seo/json-ld.tsx` — a tiny server component emitting
  `<script type="application/ld+json">`.
- Anime detail: `TVSeries` (or `Movie` when `format === "MOVIE"`) with
  `name`, `description`, `image`, `genre`, `numberOfEpisodes`, `datePublished`;
  plus a `BreadcrumbList` (Home → Anime → Title). Omit `aggregateRating` (no
  reliable rating count → avoids Google rich-result warnings).
- Root layout: `WebSite` with `potentialAction: SearchAction`
  (`/search?q={search_term_string}`) for the sitelinks search box, plus
  `Organization`.

## Testing / verification

- Typecheck + ESLint clean (repo bans setState-in-effect and ref-writes-in-render;
  parallax syncs via effect/hooks accordingly).
- Manual: detail page renders season tabs for a multi-season title (e.g. AoT),
  single-season title shows none; bare-id URL 301s to slug URL; episode-less
  anime absent from home rows/search; sitemap.xml lists anime URLs; JSON-LD
  validates; parallax honors reduced-motion.
- Format only touched files (avoid CRLF churn per repo convention).

## Delivery

One branch, logical commits in order:

1. slug URLs + `animeHref`/`parseAnimeParam` + redirect + internal links
2. hide episode-less anime
3. seasons data + season tabs
4. parallax banner
5. sitemap enumeration + JSON-LD

May be split into two PRs (feature vs SEO) if review size warrants. Domain labels
on the PR (not `epic:*`), squash-merge.
