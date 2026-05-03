# Deploy runbook (M8)

Demo deployment is mandatory per the brief (Hard Rule 6). This runbook
gets a fresh checkout from `git clone` to a live demo URL in under an
hour. **Every step has been kept platform-default-friendly** so a
reviewer can re-deploy the same way without bespoke config files.

Topology (matches REQUIREMENTS §2):

```
+--------------+        +-------------+        +--------------+
|   Vercel     |  HTTPS |  Railway    |  TLS   |  Neon        |
| (Next.js FE) |  ----> |  (Fastify)  |  ----> |  (Postgres)  |
+--------------+        +-------------+        +--------------+
       ^                       ^
       |                       | NEXT_PUBLIC_API_BASE_URL
       |                       |
   end users <-----------------+
```

If any of Vercel / Railway / Neon are unreachable on the day of the
review, fallbacks are documented at the end of this file.

---

## 0. Prereqs

- GitHub remote already configured (`git remote -v` → push URL).
- Repo is up-to-date on `main`.
- A Neon, Railway, and Vercel account (free tiers are sufficient).

## 1. Database — Neon

1. Sign in at <https://console.neon.tech> and create a project. Region: pick the same region you'll deploy the backend to (Railway US-East / Singapore).
2. Copy the **pooled** connection string from "Dashboard → Connection Details". It looks like:
   ```
   postgresql://<user>:<pwd>@<host>-pooler.<region>.aws.neon.tech/<db>?sslmode=require
   ```
   Pooled = `-pooler` in the host. We use it because Fastify keeps long-lived connections; Neon's pooler handles serverless-cold-start better than a direct connection.
3. **Run the migration** against Neon from your local machine first (so the schema exists before the BE boots in Railway):
   ```bash
   cd backend
   DATABASE_URL="<paste-neon-pooled-url>" npx prisma migrate deploy
   ```
4. **Seed** the deployed database with the demo data:
   ```bash
   cd backend
   DATABASE_URL="<paste-neon-pooled-url>" npm run db:seed
   ```
   Expect 390 items inserted across 13 sub-categories. Re-running is safe (the seed truncates first).
5. Verify with `psql` or Neon's web SQL editor: `SELECT count(*) FROM "Item";` should report 390.

## 2. Backend — Railway

1. Sign in at <https://railway.app> and create a new project from the GitHub repo. Pick the existing `JKOPay-interview` repository.
2. Railway detects `package.json` at the repo root but our backend lives in `backend/`. Set:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run build` (the `build` script now runs `prisma generate && tsc`, so the Prisma client is in the deployed bundle)
   - **Start Command**: `npm run start:prod` (runs `prisma migrate deploy` on each deploy, then `node dist/server.js`)
3. Add environment variables (Variables tab):
   | Key | Value |
   | --- | --- |
   | `DATABASE_URL` | Neon pooled URL from §1 |
   | `NODE_ENV` | `production` |
   | `HOST` | `0.0.0.0` |
   | `CORS_ORIGIN` | _temporarily_ `*` while you fetch the Vercel URL; replace with the Vercel HTTPS URL after §3 |
   | `TRUST_PROXY` | `true` (Railway terminates TLS on a single trusted hop) |
   | `RATE_LIMIT_MAX` | `100` |
   | `RATE_LIMIT_WINDOW` | `1 minute` |
   | `LOG_LEVEL` | `info` |
   | `PUBLIC_BASE_URL` | leave unset; Railway auto-injects `RAILWAY_STATIC_URL` if needed |
   `PORT` is **injected by Railway** — do not set it.
4. Trigger a deploy. Watch the build log: `prisma generate` then `tsc` then the migrate-deploy step then Fastify boot. The Fastify line `🚀 Server listening on 0.0.0.0:<port>` confirms success.
5. Click "Generate Domain" to expose the service publicly. Copy the URL — used in §3.
6. Smoke check from your laptop: `curl https://<railway-url>/items?category=ORG&limit=1` should return one item. If it 500s, check `DATABASE_URL` and that migrations ran (the `start:prod` log shows the migrate output).

## 3. Frontend — Vercel

1. Sign in at <https://vercel.com> and import the same GitHub repo.
2. Vercel auto-detects Next.js. Override:
   - **Root Directory**: `frontend`
   - Build / Output / Install commands: leave defaults.
3. Add environment variable (Settings → Environment Variables):
   - `NEXT_PUBLIC_API_BASE_URL` → the Railway HTTPS URL from §2.5 (no trailing slash).
   Add for **Production**, **Preview**, and **Development** scopes.
4. Trigger a deploy. Wait for the green checkmark.
5. Open the Vercel URL — the home page (`/`) should render with three tabs and a list of org cards. Tap a card → detail page renders. Tap `<` → back to list. Tap the magnifier → `/search` route.
6. **Tighten CORS**: go back to Railway → Variables → set `CORS_ORIGIN` to the Vercel URL (e.g. `https://jopay-demo.vercel.app`) — exact match, no trailing slash. Redeploy.

## 4. Submission

- Add the live demo URL to `README.md` and the submission email.
- The Swagger UI is at `<railway-url>/docs` — link in the README too.
- Re-test once after `CORS_ORIGIN` tightens to make sure the browser still fetches OK from the Vercel origin.

---

## Fallbacks

- **Railway down / quota exceeded**: redeploy the backend on Render with the same settings. ADR-0005 / ADR-0011 capture the rationale; the service is platform-agnostic (no Railway-specific deps).
- **Neon down**: spin up a temporary Postgres on Supabase with the same Prisma schema. Run `prisma migrate deploy` then `db:seed` against the new URL; update Railway's `DATABASE_URL` and redeploy.
- **Vercel down**: serve the FE from Cloudflare Pages with the same Next.js adapter. Same env var name.

---

## Operational notes

- **Migrations are idempotent**: `start:prod` runs `prisma migrate deploy` on every boot. Safe; no-op when in sync.
- **Cache-Control on the BE** (ADR-0012): `/items` 30s/60s, `/items/:id` 60s/300s, `/sub-categories` 300s/3600s. CDN edge cache (Vercel/Cloudflare) honors these automatically — no extra config.
- **Log retention**: Railway free tier holds ~7 days; export to a downloaded file before the demo if you need a paper trail.
- **Cold starts**: Neon serverless can take ~500ms on the first request after idle. The first hit feels slow; subsequent hits are warm.
