# Architecture

This document describes how Minna is put together: the layers, the request and
data flow, the authentication model, caching, the data model, and the HTTP API.

For setup and scripts see the [README](../README.md); for the contribution
workflow see [`CONTRIBUTING.md`](../CONTRIBUTING.md).

## Overview

Minna is a Next.js 16 App Router application. It has three external
dependencies:

- **Consumet API** — the anime data source. Only the server talks to it.
- **Neon (Postgres)** — persistent app data (users, favorites, watch progress,
  blogs, ads, background overrides), accessed through Drizzle ORM.
- **Redis** — a cache in front of Consumet.

Google OAuth is the only authentication method, handled by Auth.js
(NextAuth v5) with a stateless JWT session.

```
                    ┌──────────────────────────────────────────────┐
                    │                  Browser                      │
                    │   React 19 · Redux Toolkit · RTK Query        │
                    └───────────────┬───────────────┬──────────────┘
                          RTK Query │               │ SSR (no HTTP)
                                    ▼               │
                    ┌──────────────────────────┐    │
                    │  Route handlers           │    │
                    │  src/app/api/**           │    │
                    └───────────┬───────────────┘    │
                                ▼                     ▼
                    ┌──────────────────────────────────────────────┐
                    │  Server logic — src/lib/**                    │
                    │  anime · auth · admin · favorites · watch …   │
                    └───┬───────────────┬───────────────┬──────────┘
                        ▼               ▼               ▼
                    ┌────────┐     ┌─────────┐     ┌──────────────┐
                    │ Redis  │────▶│ Consumet│     │ Neon (Drizzle)│
                    │ cache  │     │  API    │     │   Postgres    │
                    └────────┘     └─────────┘     └──────────────┘
```

## Layers

| Layer           | Location                         | Responsibility                                          |
| --------------- | -------------------------------- | ------------------------------------------------------- |
| UI / components | `src/components/**`              | Feature-grouped React components (server + client).     |
| Client data     | `src/store/**`                   | Redux store and RTK Query APIs (browser data fetching). |
| Route handlers  | `src/app/api/**`                 | Thin HTTP endpoints; delegate immediately to `src/lib`. |
| Server logic    | `src/lib/**`                     | Queries, server actions, caching, HTTP clients, SEO.    |
| Data access     | `src/db/**`                      | Drizzle schema and client.                              |
| Auth            | `src/auth.ts`, `src/lib/auth/**` | Auth.js config, session, RBAC, user sync.               |
| Edge gate       | `src/proxy.ts`                   | Locale routing for every page; auth/RBAC on gated ones. |
| i18n            | `src/i18n/**`, `messages/**`     | Locale routing config and EN/TR/RU catalogs.            |

**Rule of thumb:** the browser never calls Consumet or the database directly.
It either renders server components (which call `src/lib` in-process) or issues
RTK Query requests to `src/app/api/**`, which call the same `src/lib` code.

## Request & data flow

There are two paths to the same server logic:

1. **SSR / Server Components** — a server component calls a `src/lib` function
   directly (in-process, no HTTP). Used for the initial render.
2. **Client fetching** — RTK Query (`src/store/api/**`) calls a route handler
   under `src/app/api/**`, which calls the same `src/lib` function. Used for
   infinite scroll, debounced search, and other client interactions.

For anime data, `src/lib` first checks Redis, and only calls Consumet on a
cache miss:

```
listPopularAnime(page)
  → cacheGet(key)         # Redis
      ↳ hit  → return cached
      ↳ miss → consumetClient.get(...)   # Consumet API
               → cacheSet(key, data, ttl)
               → return
```

## Authentication & authorization

Configured in `src/auth.ts` (Auth.js / NextAuth v5).

- **Provider:** Google only.
- **Session:** JWT strategy — the signed token lives in an httpOnly cookie, so
  there is no server-side session store. Sessions last 30 days of inactivity
  (`updateAge` slides expiry at most once a day).
- **First login (`jwt` callback):** the Google profile is mirrored into Neon
  via `syncUser`, and the internal user `id` + `role` are cached on the token.
  Subsequent requests read them from the token with **no DB round-trip**.
- **Blocked users (`signIn` callback):** `isBlockedUser` is checked before any
  session is issued (ADMIN-06); a blocked account cannot open a new session,
  while its data is preserved.
- **Session shape:** `session.user.id` and `session.user.role` are surfaced for
  server components, `useSession`, and the proxy.

`@/auth` exports `handlers` (the `/api/auth/[...nextauth]` route), `auth`
(server-side session read), and `signIn` / `signOut`.

### Role-based access control (defence in depth)

The admin panel is gated in **three layers** (`src/lib/auth/admin.ts`):

1. **`src/proxy.ts`** — an edge check on the session JWT. Signed-out users are
   sent to `/login`; signed-in non-admins are bounced to `/`, both in the
   locale they were browsing in. The `matcher` now covers every page because
   locale routing needs it, so the gate itself tests the path: the session is
   only decoded for `/profile`, `/favorites`, `/library` and `/admin`, and the
   test runs against the _unprefixed_ path so `/tr/admin` is gated exactly like
   `/admin`.
2. **`requireAdmin()`** in the admin server layout (`app/[locale]/admin/layout.tsx`) —
   re-checks the decoded session so a stale/forged cookie can't render the
   shell.
3. **Every admin Server Action / route handler** calls `requireAdmin()` itself
   — client/edge protection is never sufficient on its own.

`getCurrentAdmin()` is the non-redirecting variant, used to conditionally show
admin entry points.

## Caching

Implemented in `src/lib/cache/**` over `ioredis`.

- **Graceful degradation:** if `REDIS_URL` is unset (or Redis errors), every
  cache operation becomes a safe no-op and the origin is used. This keeps local
  dev working without Redis.
- **Namespaced keys:** `cacheKey(namespace, ...parts)` builds
  `namespace:part:part` keys to keep the keyspace organized.
- **Centralized TTLs** (`CACHE_TTL`):

  | Tier     | TTL        | Used for                                  |
  | -------- | ---------- | ----------------------------------------- |
  | `short`  | 5 minutes  | Latest / newly added episodes.            |
  | `medium` | 30 minutes | Home sections, popular/trending listings. |
  | `long`   | 24 hours   | Anime detail, categories (rarely change). |

Only anime/Consumet data is cached. Neon-backed data (favorites, watch history,
blogs, admin data) is read directly.

## Data model

Defined in `src/db/schema.ts` (Drizzle). Migrations live under `drizzle/`.

| Table               | Purpose                                                                                                                                   |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `users`             | Created on first Google login. `google_id` is the external identity; `role` (`user`/`admin`) and `blocked` drive RBAC and the block gate. |
| `favorites`         | Per-user anime bookmarks. `(user_id, anime_id)` unique (idempotent toggle); title/image denormalized.                                     |
| `ads`               | Pre-roll ads for the player. `skipAfterSeconds`, `durationSeconds`, `weight`, `active` control playback and selection.                    |
| `watch_progress`    | Per-user resume position. `(user_id, episode_id)` unique (upserted); position/duration in seconds.                                        |
| `blogs`             | Editorial posts. `slug` unique; only `published` posts are public; `publishedAt` drives ordering.                                         |
| `background_videos` | Admin overrides for atmospheric backgrounds, per `(page, variant)`. Defaults live in code; deleting a row restores the default.           |

External anime/episode ids from Consumet are stored as `text` with no foreign
key. Drizzle infers `Select`/`Insert` types per table (e.g. `User`, `NewUser`).

## HTTP API

Route handlers under `src/app/api/**`. They are intentionally thin — parsing
query params and delegating to `src/lib`.

| Method & path                      | Auth | Params                            | Returns / notes                                                             |
| ---------------------------------- | ---- | --------------------------------- | --------------------------------------------------------------------------- |
| `GET /api/anime/[section]`         | –    | `section` (path)                  | `{ results }` for a home section; `404` with `allowed` for unknown section. |
| `GET /api/anime/popular`           | –    | `page`                            | Paginated popular listing (infinite scroll).                                |
| `GET /api/anime/search`            | –    | `q`, `genre` (repeatable), `page` | Title search with genre facets and pagination.                              |
| `GET /api/blog`                    | –    | `page`                            | Paginated published blog listing (Neon).                                    |
| `GET /api/favorites`               | User | `page`                            | Per-user favorites; `401` when unauthenticated.                             |
| `GET/POST /api/auth/[...nextauth]` | –    | —                                 | Auth.js handlers (sign-in, callback, sign-out).                             |

All anime endpoints resolve through the Redis → Consumet path described above.

## Mutations (Server Actions)

State changes go through Server Actions (`actions.ts`) rather than REST
endpoints:

- `src/lib/favorites/actions.ts` — toggle a favorite.
- `src/lib/watch/actions.ts` — persist watch progress (client throttles writes).
- `src/lib/user/actions.ts` — profile-related updates.
- `src/lib/auth/actions.ts` — sign-in / sign-out.
- `src/lib/admin/{ads,blog,backgrounds,users}/actions.ts` — admin CRUD; each
  calls `requireAdmin()` first.

Admin data reads live in the sibling `queries.ts` files
(`src/lib/admin/**/queries.ts`).

## Internationalisation

`next-intl` provides EN (default) / TR / RU. Message catalogs are
`messages/{en,tr,ru}.json`; config and request handling are in `src/i18n/**`.
Every user-facing string must exist in all three catalogs.

**The locale lives in the URL** (EPIC-18), not in a cookie. Every public route
sits under `src/app/[locale]/**`, and `src/i18n/routing.ts` is the single
config both `src/proxy.ts` and `src/i18n/request.ts` read.

The prefix mode is `as-needed`: English keeps the unprefixed URLs it was
already indexed at (`/blogs`, `/anime/21-…`) and the other two are prefixed
(`/tr/blogs`, `/ru/blogs`). A redundant `/en/…` redirects away, so every page
has exactly one address per language.

- **Navigate with `@/i18n/navigation`**, never `next/link` or
  `next/navigation`'s `redirect` — those drop the prefix. They take unprefixed
  paths and apply the active locale themselves.
- **`src/i18n/paths.ts`** does the same prefixing as plain strings, for the two
  places that cannot import the navigation module: the proxy and the auth
  server actions.
- **The NEXT_LOCALE cookie is only a hint** for a bare visit, alongside
  `Accept-Language`. It decides where an unprefixed URL _sends_ a returning
  visitor; it never decides what an explicit `/tr/…` URL renders.
- **A blog post is the exception to "one page, three locales"**: it is written
  in one language and lives only under that language's prefix. See
  `src/lib/blog/href.ts`.
- **Canonical and `hreflang`** come from `src/lib/seo/locale-alternates.ts`,
  which shares `pickDefaultVersion` with the sitemap so the two cannot name
  different `x-default`s.

`npm run verify:locale -- --base=<deployment>` checks all of the above against
a running deployment.

## SEO & performance

- Metadata, `robots.ts`, `sitemap.ts`, and Open Graph are generated at the app
  level; `NEXT_PUBLIC_SITE_URL` is the canonical origin.
- Core Web Vitals (LCP/CLS/INP/FCP/TTFB) are instrumented and, when
  `NEXT_PUBLIC_WEB_VITALS_ENDPOINT` is set, beaconed via `navigator.sendBeacon`.
- Server-side data flows through the Redis cache; the client uses code-splitting
  and lazy loading. SSR/ISR render initial content without client round-trips.
