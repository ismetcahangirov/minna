# Deployment

Minna is a single Next.js (App Router) application: the frontend and the backend
(API routes, Server Actions, Auth.js handlers) ship as one deployable unit. The
recommended target is **Vercel**; **Render.com** is a documented fallback
(see [Render.com fallback](#rendercom-fallback)).

- **Primary:** [Vercel](#vercel-primary)
- **Fallback:** [Render.com](#rendercom-fallback)
- **Data stores:** Neon (Postgres) + Redis — see the production hardening notes in
  [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md) and the env reference below.

---

## Environment variables

All secrets are configured in the hosting platform's dashboard — never committed.
The full annotated list lives in [`.env.example`](../.env.example).

| Variable                          | Required | Notes                                                          |
| --------------------------------- | -------- | -------------------------------------------------------------- |
| `DATABASE_URL`                    | yes      | Neon **pooled** connection string, `?sslmode=require`.         |
| `REDIS_URL`                       | prod     | Cache layer. Unset → cache no-ops and falls through to origin. |
| `CONSUMET_API_URL`                | yes      | Base URL of the (self-hosted) Consumet API.                    |
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
[`render.yaml`](../render.yaml). Use this only if the backend cannot run on
Vercel. Detailed setup steps are documented in DEPLOY-02.
