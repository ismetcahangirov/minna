# Minna

A premium anime streaming platform built with the Next.js App Router. Minna
streams anime sourced from the [Consumet API](https://github.com/consumet),
authenticates exclusively through Google OAuth, and ships in three languages —
**English (default), Turkish, and Russian**.

[![CI](https://github.com/ismetcahangirov/minna/actions/workflows/ci.yml/badge.svg)](https://github.com/ismetcahangirov/minna/actions/workflows/ci.yml)

> **Design language:** pure-black canvas (`#000000`), Netflix-red accent
> (`#E50914`), sharp corners, no glassmorphism, no gradients on UI surfaces,
> SVG icons only. Atmospheric background videos on the login, profile, search
> and 404 pages are a deliberate, separate layer. See `DESIGN-SPEC.md`.

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Scripts](#scripts)
- [Project structure](#project-structure)
- [Database & migrations](#database--migrations)
- [Internationalisation](#internationalisation)
- [Deployment](#deployment)
- [Documentation](#documentation)
- [Contributing](#contributing)

---

## Features

- **Home & catalog** — curated anime sections with SSR/ISR and Redis-cached
  data from the embedded Consumet/AniList provider.
- **Search & browse** — debounced title search with genre facets, plus a
  paginated Popular listing with infinite scroll.
- **Anime detail & watch** — episode listing, a custom video player with a
  pre-roll ad system, "next episode" flow, and resume-where-you-left-off watch
  progress.
- **Accounts** — Google-only sign-in, profile page, favorites, and watch
  history.
- **Editorial blog** — admin-authored posts with public listing and detail
  pages.
- **Admin panel** — role-gated management of ads, atmospheric background
  videos, blog posts and users. See [`docs/ADMIN-GUIDE.md`](docs/ADMIN-GUIDE.md).
- **i18n** — EN / TR / RU across the whole UI.
- **SEO & performance** — metadata, sitemap, robots, Open Graph, Core Web
  Vitals instrumentation, code-splitting and a Redis cache layer.
- **Fully responsive** — mobile, tablet and desktop.

## Tech stack

| Area         | Choice                                               |
| ------------ | ---------------------------------------------------- |
| Framework    | Next.js 16 (App Router) + React 19 + TypeScript      |
| Data source  | Embedded Consumet (`@consumet/extensions`) + AniList |
| Database     | Neon (Postgres) via Drizzle ORM + drizzle-kit        |
| Cache        | Redis (`ioredis`)                                    |
| Auth         | Auth.js (NextAuth v5) — Google OAuth only            |
| State / data | Redux Toolkit + RTK Query                            |
| Styling      | Tailwind CSS v4 + shadcn / Base UI                   |
| i18n         | next-intl (EN / TR / RU)                             |
| Icons        | lucide-react (SVG only — no emoji)                   |
| Tooling      | ESLint, Prettier, Husky + lint-staged, commitlint    |
| Deploy       | Vercel (Render.com fallback — see `render.yaml`)     |

## Getting started

### Prerequisites

- **Node.js `>= 22`** (see `engines` in `package.json`)
- A **Neon** (or any Postgres) database URL
- A **Redis** instance (optional in dev — the cache degrades to a no-op when
  `REDIS_URL` is unset)
- **Google OAuth** credentials (Client ID + Secret)
- No external anime API is required — data is fetched in-process via the
  embedded **`@consumet/extensions`** AniList provider (metadata from AniList;
  streams from a swappable `ANIME_PROVIDER` sub-provider)

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Create your local env file and fill in real values
cp .env.example .env.local

# 3. Apply the database schema
npm run db:migrate

# 4. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

Copy `.env.example` to `.env.local` and fill in real values. Never commit
`.env.local`.

| Variable                          | Required | Description                                                                    |
| --------------------------------- | :------: | ------------------------------------------------------------------------------ |
| `DATABASE_URL`                    |   Yes    | Neon/Postgres pooled connection string. Used by Drizzle and drizzle-kit.       |
| `REDIS_URL`                       |   No\*   | Redis connection URL. If unset, the cache layer becomes a no-op (dev only).    |
| `ANIME_PROVIDER`                  |    No    | Embedded streaming sub-provider (default `animekai`). Switch if a source dies. |
| `GOOGLE_CLIENT_ID`                |   Yes    | Google OAuth client ID (Google Cloud Console → Credentials).                   |
| `GOOGLE_CLIENT_SECRET`            |   Yes    | Google OAuth client secret.                                                    |
| `NEXTAUTH_SECRET`                 |   Yes    | Auth.js session secret. Generate with `openssl rand -base64 32`.               |
| `NEXTAUTH_URL`                    |   Yes    | Canonical app URL (`http://localhost:3000` in dev).                            |
| `NEXT_PUBLIC_SITE_URL`            |   Yes    | Public site URL used for metadata / sitemap / Open Graph.                      |
| `NEXT_PUBLIC_WEB_VITALS_ENDPOINT` |    No    | Endpoint that receives Core Web Vitals beacons. Leave unset in dev.            |
| `NEXT_TELEMETRY_DISABLED`         |    No    | Set to `1` to disable Next.js telemetry.                                       |

\* Recommended in any shared/production environment.

## Scripts

| Script                   | Purpose                                                 |
| ------------------------ | ------------------------------------------------------- |
| `npm run dev`            | Start the Next.js dev server.                           |
| `npm run build`          | Production build.                                       |
| `npm run start`          | Serve the production build.                             |
| `npm run lint`           | Run ESLint.                                             |
| `npm run format`         | Format the repository with Prettier.                    |
| `npm run format:check`   | Check formatting without writing.                       |
| `npm run db:generate`    | Generate a Drizzle migration from the schema.           |
| `npm run db:migrate`     | Apply pending migrations to the database.               |
| `npm run db:push`        | Push the schema directly (dev convenience).             |
| `npm run db:studio`      | Open Drizzle Studio.                                    |
| `npm run validate:video` | Validate a background/ad video against the format gate. |
| `npm run bench:cache`    | Benchmark the Redis cache strategy.                     |

## Project structure

```
src/
├── app/                 # App Router routes
│   ├── admin/           # Role-gated admin panel (ads, backgrounds, blogs, users)
│   ├── api/             # Route handlers (anime, blog, favorites, auth)
│   ├── anime/           # Anime detail
│   ├── watch/           # Episode player
│   ├── search/ popular/ favorites/ profile/ blogs/ login/
│   ├── layout.tsx  page.tsx  not-found.tsx  robots.ts  sitemap.ts
├── components/          # UI, grouped by feature (admin, anime, watch, header, …)
├── db/                  # Drizzle schema + client
├── i18n/                # next-intl config, request handling, locale switching
├── lib/                 # Server logic: anime, auth, cache, http, admin, seo, …
├── store/               # Redux Toolkit store + RTK Query APIs
├── types/               # Shared TypeScript types
├── auth.ts              # Auth.js (NextAuth) configuration
└── proxy.ts             # Edge request gate (e.g. /admin protection)
drizzle/                 # SQL migrations + meta
messages/                # en.json / tr.json / ru.json translation catalogs
docs/                    # Architecture & admin guides
```

## Database & migrations

The schema lives in `src/db/schema.ts` (Drizzle ORM). Tables: `users`,
`favorites`, `ads`, `watch_progress`, `blogs`, `background_videos`.

```bash
npm run db:generate   # after editing src/db/schema.ts
npm run db:migrate    # apply to the database
```

Migrations are committed under `drizzle/`. See
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full data model.

## Internationalisation

UI text lives in `messages/{en,tr,ru}.json` and is consumed through
`next-intl`. English is the default. When adding any user-facing string, add
the key to all three catalogs.

## Deployment

Primary target is **Vercel**. A **Render.com** fallback is described in
`render.yaml`. Production requires a Neon database and a Redis instance; set
every required variable from the [environment table](#environment-variables) in
your host's dashboard.

## Documentation

| Document                                       | Contents                                       |
| ---------------------------------------------- | ---------------------------------------------- |
| [`CONTRIBUTING.md`](CONTRIBUTING.md)           | Branch, commit and PR workflow; local checks.  |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System architecture, data flow, API reference. |
| [`docs/ADMIN-GUIDE.md`](docs/ADMIN-GUIDE.md)   | Admin panel usage guide.                       |
| `DESIGN-SPEC.md`                               | Design system and per-page specifications.     |
| `PROJECT-ISSUES.md`                            | Epic / sub-issue breakdown.                    |

## Contributing

Please read [`CONTRIBUTING.md`](CONTRIBUTING.md) before opening a pull request.
In short: pull `main`, branch per task (`feature/…`, `fix/…`, `chore/…`,
`docs/…`), write Conventional Commits, and open an English PR with the right
labels.
