# Backlog

Delivery tracker for the Minna anime streaming platform. The source of truth
for scope is [`PROJECT-ISSUES.md`](./PROJECT-ISSUES.md); the source of truth for
status is the GitHub issue tracker. This file is the at-a-glance board that maps
epics → sub-issues → state so the next task is always obvious.

**Legend:** `[x]` done · `[~]` in progress / open PR · `[ ]` todo

---

## Progress overview

| Epic                                   | Issue | Status   |
| -------------------------------------- | ----- | -------- |
| EPIC-01 · Project Setup                | #4    | [x] Done |
| EPIC-02 · Authentication (Google)      | #14   | [x] Done |
| EPIC-03 · Header & Navigation          | #19   | [x] Done |
| EPIC-04 · Home Page                    | #26   | [x] Done |
| EPIC-05 · Anime Detail Page            | #34   | [x] Done |
| EPIC-06 · Episode Watch + Video Player | #39   | [x] Done |
| EPIC-07 · Search Page                  | #45   | [ ] Todo |
| EPIC-08 · Popular / Blogs / Favorites  | #50   | [ ] Todo |
| EPIC-09 · Profile Page                 | #56   | [ ] Todo |
| EPIC-10 · Login Page                   | #60   | [ ] Todo |
| EPIC-11 · 404 Page                     | #63   | [ ] Todo |
| EPIC-12 · Admin Panel                  | #66   | [ ] Todo |
| EPIC-13 · SEO & Performance            | #74   | [ ] Todo |
| EPIC-14 · Responsive Design            | #79   | [ ] Todo |
| EPIC-15 · Documentation                | #83   | [ ] Todo |
| EPIC-16 · Deployment                   | #88   | [ ] Todo |

---

## Completed

### EPIC-01 · Project Setup (#4)

- [x] SETUP-01 Next.js (App Router) + TypeScript scaffold
- [x] SETUP-02 Tailwind CSS + shadCN, design tokens
- [x] SETUP-03 Redux Toolkit + RTK Query + Axios base instance
- [x] SETUP-04 Neon (Postgres) connection + Drizzle ORM
- [x] SETUP-05 Redis cache layer
- [x] SETUP-06 i18n (next-intl) — EN default, TR, RU
- [x] SETUP-07 ESLint, Prettier, Husky/lint-staged, commit conventions
- [x] SETUP-08 Vercel deploy config (+ Render.com fallback)
- [x] SETUP-09 `.env.example`

### EPIC-02 · Authentication (#14)

- [x] AUTH-01 Google OAuth (Auth.js / NextAuth v5)
- [x] AUTH-02 Persist the Google user in Neon on login
- [x] AUTH-03 Protected-route proxy (login-only areas)
- [x] AUTH-04 Session/token management + logout

### EPIC-03 · Header & Navigation (#19)

- [x] HEADER-01 Header layout (left logo, fixed, transparent)
- [x] HEADER-02 Categories dropdown from Consumet
- [x] HEADER-03 Navigation links (Favorites, New, Popular, Blogs, Search)
- [x] HEADER-04 Right side — Login button / profile dropdown
- [x] HEADER-05 Language switch (EN/TR/RU)
- [x] HEADER-06 Mobile/tablet burger menu

### EPIC-04 · Home Page (#26)

- [x] HOME-01 Hero/banner section
- [x] HOME-02..05 Latest / Popular / Top-rated / Trending rows (16:9 cards)
- [x] HOME-06 Anime card component (hover animation)
- [x] HOME-07 Data fetching — Consumet + RTK Query + Redis (SSR/ISR)

### EPIC-05 · Anime Detail Page (#34)

- [x] DETAIL-01 Display anime info (title, description, genre, rating) (#35)
- [x] DETAIL-02 Episode list component (#36)
- [x] DETAIL-03 "Add to favorites" functionality (#37)
- [x] DETAIL-04 SEO metadata (dynamic meta tags, Open Graph) (#38)

> Route: `/anime/[id]` (SSR). Server-only `getAnimeInfo` with long-TTL Redis
> cache; `favorites` table + auth-guarded `toggleFavorite` server action;
> optimistic favorite toggle and episode order toggle as the only client
> islands. **Follow-up:** apply the `favorites` migration
> (`drizzle/0001_*.sql`) to the Neon database before the feature works in
> production (`npm run db:migrate`).

### EPIC-06 · Episode Watch + Video Player + Ads (#39)

- [x] PLAYER-01 Custom video player (play/pause, progress, volume, fullscreen,
      quality, subtitles) (#40)
- [x] PLAYER-02 Pre-roll ad overlay (admin-configured skip countdown,
      YouTube-style) (#41)
- [x] PLAYER-03 Fetch ad content from the backend (admin-managed) (#42)
- [x] PLAYER-04 Next-episode navigation + auto-suggest overlay (#43)
- [x] PLAYER-05 Store watch progress (resume where you left off) (#44)

> Route: `/watch/[animeId]/[episodeId]` (SSR + dynamic SEO). Server-only
> `getEpisodeSources` (short-TTL Redis cache) feeds a client `WatchExperience`
> island that sequences the pre-roll ad into the custom player, shows an
> "up next" overlay on end, and persists throttled watch progress. New `ads`
> and `watch_progress` tables; weighted-random `getActivePreRollAd` selector;
> auth-guarded `saveWatchProgress` server action. **Follow-up:** apply the
> migration (`drizzle/0002_*.sql`) to Neon before ads/progress work in
> production, and seed rows via the EPIC-12 admin panel.

---

## Upcoming

### EPIC-07 · Search Page (#45)

- [ ] SEARCH-01 Search input + Consumet integration
- [ ] SEARCH-02 Results (16:9 cards)
- [ ] SEARCH-03 Background animation video
- [ ] SEARCH-04 Debounce / filtering

### EPIC-08 · Popular / Blogs / Favorites — infinite scroll (#50)

- [ ] LIST-01 `IntersectionObserver` infinite-scroll hook (shared)
- [ ] LIST-02 Popular page (vertical cards)
- [ ] LIST-03 Blogs page (vertical cards)
- [ ] LIST-04 Favorites page (logged-in only) — consumes the EPIC-05
      `favorites` table / `isFavorite`
- [ ] LIST-05 Blog detail page

### EPIC-09 · Profile Page (#56)

- [ ] PROFILE-01 Display/edit user info
- [ ] PROFILE-02 Background animation video (mobile + tablet/web)
- [ ] PROFILE-03 Watch history / favorites quick view

### EPIC-10 · Login Page (#60)

- [ ] LOGIN-01 Google login button + flow (target of the detail page's
      favorite-when-signed-out redirect)
- [ ] LOGIN-02 Background animation video

### EPIC-11 · 404 Page (#63)

- [ ] 404-01 Implement the 404 design (replaces the scoped anime not-found)
- [ ] 404-02 Background animation video

### EPIC-12 · Admin Panel (#66)

- [ ] ADMIN-01 Admin auth/permission (RBAC)
- [ ] ADMIN-02 Ad management
- [ ] ADMIN-03 Video format-validation script
- [ ] ADMIN-04 Per-page background video management
- [ ] ADMIN-05 Blog management
- [ ] ADMIN-06 User management
- [ ] ADMIN-07 Admin background animation video support

### EPIC-13 · SEO & Performance (#74)

- [ ] PERF-01 Metadata, sitemap.xml, robots.txt
- [ ] PERF-02 Image/video optimization
- [ ] PERF-03 Core Web Vitals audit
- [ ] PERF-04 Redis cache performance testing

### EPIC-14 · Responsive Design (#79)

- [ ] RESP-01 Mobile breakpoint (all pages)
- [ ] RESP-02 Tablet breakpoint (all pages)
- [ ] RESP-03 Desktop/large-screen (all pages)

### EPIC-15 · Documentation (#83)

- [ ] DOCS-01 Professional README
- [ ] DOCS-02 CONTRIBUTING.md
- [ ] DOCS-03 API/architecture docs
- [ ] DOCS-04 Admin panel usage guide

### EPIC-16 · Deployment (#88)

- [ ] DEPLOY-01 Deploy frontend (+ backend) on Vercel
- [ ] DEPLOY-02 Render.com fallback deploy
- [ ] DEPLOY-03 Neon + Redis production config
- [ ] DEPLOY-04 CI/CD pipeline (GitHub Actions) — test + lint + build

---

## Cross-cutting constraints & tech debt

- **Consumet public API is down (HTTP 451).** Every anime data layer degrades
  gracefully to empty/`null` when the origin is unreachable. A self-hosted
  `CONSUMET_API_URL` is required for real data (see `.env.example`).
- **No CI yet.** `test + lint + build` is planned in DEPLOY-04. Until then, run
  `npm run lint` and `npm run build` locally before opening a PR. The repo
  squash-merges PRs.
- **Pending DB migrations.** `drizzle/0001_*.sql` (the `favorites` table) and
  `drizzle/0002_*.sql` (the `ads` + `watch_progress` tables) must be applied to
  Neon (`npm run db:migrate`) before favorites, ads and watch progress work in
  production.
- **Deferred routes.** Header/detail links to `/favorites`, `/popular`, `/new`,
  `/blogs`, `/search`, `/login` and `/watch/*` are intentional forward links to
  routes built in later epics.
