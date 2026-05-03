# Deploy runbook (M8)

Demo deployment is mandatory per the brief (Hard Rule 6). This runbook
gets a fresh checkout from `git clone` to a live demo URL in under an
hour using **Railway-only** for all three tiers (DB + BE + FE) in a
single project. BE and FE deploy from **Dockerfiles in the repo** —
Railway auto-detects them on import, so no Build/Start command tweaking
in the platform UI.

Topology (one Railway project, three services):

```
        +----------------------------+
        | Railway project: jopay     |
        |                            |
        |  +----------+              |
        |  | Postgres |  internal    |
        |  +----------+ <--+         |
        |        ^         |         |
        |        |         |         |
        |   ${{Postgres.DATABASE_URL}}|
        |        |         |         |
        |  +----------+    |         |
        |  | Fastify  | <--+         |
        |  +----------+              |
        |        ^                   |
        |        | NEXT_PUBLIC_API_BASE_URL
        |        |                   |
        |  +----------+              |
        |  | Next.js  |              |
        |  +----------+              |
        +----------------------------+
                  ^
                  | HTTPS public domain
                  |
              end users
```

Why one platform: simpler ops (one dashboard, one billing, one set of
env vars), BE↔DB stays on Railway's internal network so the DB never
exposes a public port, and total setup is ~20 min instead of ~60 min
across three providers.

---

## 0. Prereqs

- GitHub remote configured (`git remote -v` → push URL).
- Repo up-to-date on `main`.
- A Railway account (<https://railway.app>). Free trial covers a
  ~30-day demo window for three small services.

## 1. Create the project + Postgres

1. Sign in at <https://railway.app>, click **New Project**.
2. Pick **Deploy PostgreSQL** as the first service. Railway provisions
   it and exposes a project-scoped variable `Postgres.DATABASE_URL`
   that other services in the same project reference via Railway's
   variable interpolation syntax (`${{Postgres.DATABASE_URL}}`).
3. **Do not** open a public port on the Postgres service. The default
   is internal-only; that's what we want — the BE reaches it via
   `postgres.railway.internal`, never over the public internet.

## 2. Backend service (Fastify)

1. In the same project, click **New → GitHub Repo** and pick
   `JKOPay-interview`.
2. Settings (Service → Settings tab):
   - **Root Directory**: `backend`
   - Railway auto-detects [`backend/Dockerfile`](../backend/Dockerfile) and
     uses it. **Leave Build / Start Commands blank** — the Dockerfile
     defines them (multi-stage build → `npm run start:prod` as `CMD`,
     which runs `prisma migrate deploy` then `node dist/server.js`).
3. Variables tab:
   | Key | Value |
   | --- | --- |
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (Railway interpolates the Postgres service's URL — internal network) |
   | `NODE_ENV` | `production` |
   | `HOST` | `0.0.0.0` |
   | `CORS_ORIGIN` | `*` _temporarily_ until §3 hands you the FE URL; tighten in §4 |
   | `TRUST_PROXY` | `true` (Railway terminates TLS on a single trusted hop) |
   | `RATE_LIMIT_MAX` | `100` |
   | `RATE_LIMIT_WINDOW` | `1 minute` |
   | `LOG_LEVEL` | `info` |
   `PORT` is **injected by Railway** — do not set it. `PUBLIC_BASE_URL`
   can stay unset (only used to render Swagger's server URL).
4. Deploy. Watch the build log: Docker stages `deps` → `builder`
   (`prisma generate` + `tsc`) → `runner` (prod-only `npm install`).
   Then runtime: `prisma migrate deploy` → Fastify boot. The line
   `🚀 Server listening on 0.0.0.0:<port>` confirms success.
5. **Settings → Networking → Generate Domain**. Copy the
   `https://<...>.up.railway.app` URL — used in §3.
6. Smoke check from your laptop:
   ```bash
   curl https://<be-url>/items?category=ORG&limit=1
   ```
   Should return one item. If 500 / blank: check the deploy log for
   `DATABASE_URL` errors or migration failures.
7. **Seed** the deployed DB with mock data (one-off; not part of
   `start:prod`). Open the Postgres service → **Connect** tab → copy
   the public connection URL (TCP proxy form), then from your laptop:
   ```bash
   cd backend
   DATABASE_URL="<public-postgres-url>" npm run db:seed
   ```
   Expect 390 items inserted across 13 sub-categories. Re-running is
   safe (the seed truncates first). Verify via the BE smoke check above.

## 3. Frontend service (Next.js)

1. Same project → **New → GitHub Repo** → pick `JKOPay-interview` again.
2. Settings:
   - **Root Directory**: `frontend`
   - Railway auto-detects [`frontend/Dockerfile`](../frontend/Dockerfile) — leave
     Build / Start Commands blank. The Dockerfile uses Next.js's
     `output: 'standalone'` (set in [next.config.ts](../frontend/next.config.ts))
     to produce a slim runner image: ~91 MB compressed, no full
     `node_modules` at runtime.
3. Variables tab:
   - `NEXT_PUBLIC_API_BASE_URL` = the BE Railway URL from §2.5
     (no trailing slash). The `NEXT_PUBLIC_` prefix bakes it into the
     client bundle **at build time** — Railway re-runs `next build`
     whenever this var changes, so set it before first deploy and
     re-deploy after any change.
4. Deploy. Wait for the green checkmark.
5. **Generate Domain** for the FE service too. Open the URL — the
   home page should render with three tabs and the org list. Tap a
   card → detail page renders. Tap `<` → back. Tap the magnifier → `/search`.

## 4. Tighten CORS

Once §3 gives you the FE URL:

1. Back to BE service → Variables → set `CORS_ORIGIN` to the exact FE
   Railway URL (e.g. `https://jopay-fe-production.up.railway.app`).
   No trailing slash; wildcard is unsafe in production.
2. BE redeploys automatically on env-var change. Wait for green.
3. Reload the FE in a browser — should still load (means CORS allow
   list is correct). Browser dev-tools Network tab shows
   `Access-Control-Allow-Origin: <FE-URL>` on the `/items` response.

## 5. Submission

- Copy the FE URL into `README.md` and the submission email as the demo URL.
- Swagger UI is at `<be-url>/docs` — link in README so the reviewer can poke the API directly.
- Run one final smoke pass from a fresh browser / incognito to make sure no service is gating on a session cookie.

---

## Fallbacks (if Railway is flaky on the day)

- **DB**: Neon (<https://console.neon.tech>) gives a Postgres URL the
  same shape as Railway's. Run `prisma migrate deploy` then
  `npm run db:seed` against the Neon URL, swap `DATABASE_URL` in
  Railway's BE service, redeploy.
- **BE**: Render (<https://render.com>) auto-detects Node from
  `package.json`. Same env vars, same start command (`npm run start:prod`).
- **FE**: Vercel (<https://vercel.com>). Import same repo, root
  directory `frontend`, set `NEXT_PUBLIC_API_BASE_URL` to the Railway
  BE URL. Vercel adds global CDN edge caching for free.

---

## Operational notes

- **Migrations are idempotent**: `start:prod` runs `prisma migrate deploy`
  on every boot. Safe; no-op when in sync.
- **Cache-Control on the BE** (ADR-0012): `/items` 30s/60s,
  `/items/:id` 60s/300s, `/sub-categories` 300s/3600s. Browsers and
  any in-front CDN honor these automatically — no extra config.
- **Internal networking**: BE uses `postgres.railway.internal` (set by
  the `${{Postgres.DATABASE_URL}}` interpolation). External hosts
  cannot reach the DB. Re-run `npm run db:seed` only requires opening
  the Postgres service's public TCP proxy via the Connect tab; no
  permanent public exposure.
- **Cold starts**: Railway sleeps idle services on the trial tier.
  First request after idle takes ~1–2s. Subsequent requests are warm.
- **Log retention**: Railway free tier holds ~7 days; download a
  snapshot before the demo if you need a paper trail.
