# Deployment

Minna is a single Next.js (App Router) application: the frontend and the backend
(API routes, Server Actions, Auth.js handlers) ship as one deployable unit. The
recommended target is **Vercel**; **Render.com** is a documented fallback
(see [Render.com fallback](#rendercom-fallback)).

- **Primary:** [Vercel](#vercel-primary)
- **Fallback:** [Render.com](#rendercom-fallback)
- **Data stores:** [Neon (Postgres) + Redis](#data-stores-production) — see also
  [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md) and the env reference below.

---

## Environment variables

All secrets are configured in the hosting platform's dashboard — never committed.
The full annotated list lives in [`.env.example`](../.env.example).

| Variable                          | Required | Notes                                                          |
| --------------------------------- | -------- | -------------------------------------------------------------- |
| `DATABASE_URL`                    | yes      | Neon **pooled** connection string, `?sslmode=require`.         |
| `REDIS_URL`                       | prod     | Cache layer. Unset → cache no-ops and falls through to origin. |
| `ANIME_PROVIDER`                  | no       | Streaming sub-provider (embedded). Default `animekai`.         |
| `GOOGLE_CLIENT_ID`                | yes      | Google OAuth — the only auth method.                           |
| `GOOGLE_CLIENT_SECRET`            | yes      | Google OAuth.                                                  |
| `NEXTAUTH_SECRET`                 | yes      | `openssl rand -base64 32`.                                     |
| `NEXTAUTH_URL`                    | yes      | Canonical app URL, e.g. `https://minna.app`.                   |
| `NEXT_PUBLIC_SITE_URL`            | yes      | Public URL for metadata / sitemap / Open Graph.                |
| `NEXT_PUBLIC_WEB_VITALS_ENDPOINT` | no       | If set, Core Web Vitals beacons are POSTed here.               |
| `NEXT_TELEMETRY_DISABLED`         | no       | `1` disables Next.js telemetry.                                |

> After changing the deployed URL, update **both** `NEXTAUTH_URL` and
> `NEXT_PUBLIC_SITE_URL`, and add the callback
> `https://<domain>/api/auth/callback/google` to the Google OAuth client's
> authorized redirect URIs.

---

## Vercel (primary)

Vercel auto-detects the Next.js framework; [`vercel.json`](../vercel.json) pins
the region (`fra1`) and the baseline security headers. No custom build settings
are needed.

### First deploy

1. Import the GitHub repo at [vercel.com/new](https://vercel.com/new) and select
   the `minna` project.
2. Framework preset: **Next.js** (auto-detected). Build command `next build`,
   output handled by Vercel — leave the defaults.
3. Add every variable from the table above under **Settings → Environment
   Variables** for the **Production** (and **Preview**) environments.
4. Deploy. Vercel builds and promotes the production deployment automatically on
   every push to `main`; pull requests get preview deployments.

### Health & verification

- Liveness endpoint: `GET /api/health` → `{ "status": "ok", ... }`.
- Confirm `GET /robots.txt` and `GET /sitemap.xml` render, and that Google login
  completes end-to-end (callback URL must be authorized).

### Node.js runtime

The project targets Node `>=22` (`.nvmrc`, `package.json#engines`). Set the
Vercel project's **Node.js Version** to 22.x under **Settings → General**.

---

## Render.com fallback

The Next.js app also runs as a plain Node web service, described declaratively in
[`render.yaml`](../render.yaml). Use this **only** if the backend cannot run on
Vercel — the app is otherwise identical on both platforms.

### Blueprint

`render.yaml` provisions one `web` service (`minna-web`) in the `frankfurt`
region on the `starter` plan:

- **Build:** `npm ci && npm run build`
- **Start:** `npm run start`
- **Health check:** `/api/health` — Render restarts the instance if this path
  stops returning `2xx`.
- **`autoDeploy: false`** — deploys are triggered manually (or via the deploy
  hook) rather than on every push, matching the manual-merge workflow.

### First deploy

1. In the Render dashboard choose **New → Blueprint** and point it at the repo.
   Render reads `render.yaml` and creates the `minna-web` service.
2. Set every `sync: false` variable under the service's **Environment** tab —
   the secrets and both URLs from the [env table](#environment-variables).
   `NEXTAUTH_URL` and `NEXT_PUBLIC_SITE_URL` must equal the public Render URL
   (e.g. `https://minna-web.onrender.com`).
3. Add `https://<render-url>/api/auth/callback/google` to the Google OAuth
   client's authorized redirect URIs.
4. Trigger the first deploy. Verify `GET /api/health` returns `200`.

### Notes

- `NODE_VERSION` is pinned to `22` to match `.nvmrc` / `package.json#engines`.
- The `starter` plan sleeps on inactivity; the health check keeps a paid
  instance warm. Scale via `numInstances` / `plan` in `render.yaml` if needed.

---

## Data stores (production)

### Neon (Postgres)

- **Driver:** Drizzle over the Neon **HTTP** driver (`drizzle-orm/neon-http`,
  `src/db/index.ts`) — stateless, fetch-based queries with no persistent socket,
  which is ideal for serverless/Fluid Compute. There is no connection pool to
  size on the app side.
- **`DATABASE_URL`:** use Neon's **pooled** connection string (the host contains
  `-pooler`) with `?sslmode=require`. Pooling is handled by Neon's PgBouncer, so
  the serverless functions never exhaust Postgres connections under bursty load.
- **Migrations:** generated SQL lives in `drizzle/`. Apply to production with
  `DATABASE_URL=<prod> npm run db:migrate` (run from CI or locally against the
  production branch). Do **not** use `db:push` against production.
- **Branching:** develop against a Neon branch, then promote — production keeps a
  stable branch with its own `DATABASE_URL`.

### Redis

- **Client:** a single `ioredis` connection cached on `globalThis`
  (`src/lib/cache/redis.ts`) and reused across warm invocations. Configured to
  fail fast: `maxRetriesPerRequest: 2`, `enableOfflineQueue: false`, capped
  reconnects.
- **`REDIS_URL`:** point at a managed provider (Upstash, Redis Cloud). Use the
  `rediss://` scheme for TLS — `ioredis` enables TLS automatically for it.
- **Graceful degradation:** if `REDIS_URL` is unset or the server is unreachable,
  the cache layer no-ops and every read falls through to the origin. A cache
  outage never fails a request — so Redis is **not** required for the app to
  serve, only for performance.
- **TTLs:** centralized in `CACHE_TTL` (`src/lib/cache/cache.ts`) — 5 min for
  fast-changing data, 30 min for listings, 24 h for near-static detail.

### Readiness probe

`GET /api/ready` exercises both stores and reports each:

```json
{ "status": "ready", "checks": { "database": "ok", "redis": "ok" } }
```

- `database` is required → a failure returns HTTP **503** (`status: not_ready`).
- `redis` is optional → `ok` / `unconfigured` / `error` is reported, but a
  degraded cache still returns **200**.

Use `/api/ready` for deploy verification and external uptime monitors; keep
`/api/health` (liveness) as the platform `healthCheckPath` so a transient store
blip does not trigger an instance restart.
