# Progress Log

A running, append-only-ish log of where we are. Don't be ceremonial — just keep
it current. Format per entry: date, what changed, what's next, blockers.

## Status snapshot

- **Phase**: M3 complete. **RR-004 `awaiting-review`** (FE skeleton). Ready for M4 (card list + virtualized infinite scroll) once Codex approves.
- **Last updated**: 2026-05-02
- **Branch**: main (git initialized; baseline commit `4df3baf init`)

## Milestones

Critical-path: M1 → M2 → M3 → M4 → M5 → M6 → M8. Tests (M7) and final prep (M9) can run alongside or after the deploy. Demo URL (M8) is mandatory; never cut.

| #   | Milestone                                                                                                                                | Status   |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| M0  | Repo scaffolding + agent-collab docs                                                                                                     | done     |
| M1  | BE skeleton: Fastify + TS + Prisma `Item` schema (`category` + `subCategory` enums + nullable category-specific fields) + Postgres + seed (≥90 items, real logos for some) | done    |
| M2  | API endpoints: `GET /items` (category + subCategory + q + cursor) + `GET /items/:id` + `GET /sub-categories` + Swagger + production hardening (pg_trgm GIN, compress, ETag-deferred, rate-limit with TRUST_PROXY env, request-id) | done     |
| M3  | FE skeleton: Next.js App Router + Tailwind + `next-intl` (zh-TW) + responsive shell; `/` view with red header + 3 tabs + functional sub-category dropdown | review  |
| M4  | Card list + virtualized infinite scroll (`react-window`) + end-of-list separator                                                         | pending  |
| M5  | `/search` route: input + abort + debounce + loading + empty + tabbed results + restore-on-cancel                                         | pending  |
| M6  | `/items/[id]` detail page: category-specific mock fields + back-with-scroll-restore                                                      | pending  |
| M7  | Tests: unit (API + cursor + restore logic) + e2e (scroll, tab switch, search→empty, cancel-restore, detail nav)                          | pending  |
| M8  | Deploy demo: Vercel (FE) + Railway (BE) + Neon (DB)                                                                                      | pending  |
| M9  | Final prep: README (incl. AI 使用聲明) + ADR bodies (0003–0009) + rename `docs/AI_JOURNAL.md` → `docs/prompts/`                          | pending  |

### M9 sub-tasks (final prep — runs against `docs/REQUIREMENTS.md` §5.G)

Drawn from the brief's submission checklist + our REQUIREMENTS.md §5.G. Each item must be done before the submission email goes out.

- *README authoring:*
  - [ ] **Install & run** section — clone, `docker compose up`, `prisma db seed`, `npm run dev` (BE + FE), env vars
  - [ ] **API documentation** — every endpoint (`GET /items`, `GET /items/:id`, `GET /sub-categories`), query params, request/response shapes, sample curl
  - [ ] **`## AI 使用聲明`** with the brief's three required bullets:
    - [ ] 使用的 AI 工具 (Claude Code, Codex CLI, plus anything else used)
    - [ ] AI 負責的範圍 (which modules/files were AI-produced or AI-assisted)
    - [ ] 你自己負責的範圍 (which parts you completed independently or substantially modified)
  - [ ] **Prompt 紀錄 pointer** — explicit pointer to `docs/prompts/` (Option 1 chosen)
  - [ ] **Architecture overview** — short paragraph + link to `docs/decisions/`
  - [ ] **Demo link** — Vercel URL prominently at the top of README
  - [ ] **Error-shape note** — document the deliberate split: schema validation failures return Fastify-shaped 400s; semantic failures (invalid sub-category for the chosen category, malformed cursor) return custom-shaped 400s. (Per Codex RR-002 suggestion.)
- *ADR bodies (Status: Proposed → Accepted):*
  - [ ] ADR-0003 Next.js — body filled with context/decision/consequences (currently stub)
  - [ ] ADR-0004 Prisma — body filled
  - [ ] ADR-0005 Postgres + docker-compose — body filled
  - [ ] ADR-0006 Cursor pagination — body filled
  - [ ] ADR-0007 next-intl — body filled (or superseded if shim fallback was taken; see RISKS R10)
  - [ ] ADR-0008 react-window — body filled
  - [ ] ADR-0009 Tab + scroll restore — body filled
  - [ ] At least 3 of ADR-0003 through ADR-0009 have bodies (brief minimum)
- *Prompt records folder rename:*
  - [ ] Curate 2–3 representative exchanges from `docs/AI_JOURNAL.md`
  - [ ] Move/restructure `docs/AI_JOURNAL.md` → `docs/prompts/README.md` (curated index) and/or per-exchange files
  - [ ] Cull noise; sanitize any accidentally captured secrets
  - [ ] Update README's `## AI 使用聲明` link from `docs/AI_JOURNAL.md` → `docs/prompts/`
  - [ ] Update `AGENTS.md` "Required reading" list (item 5) from `docs/AI_JOURNAL.md` → `docs/prompts/`
  - [ ] Search-and-replace any other `AI_JOURNAL.md` references across `docs/`
- *Submission email assembly:*
  - [ ] GitHub repo public; verify in private window
  - [ ] Demo URL reachable in private window (no auth, no env-var leakage)
  - [ ] Email contains both links and a one-paragraph orientation

## Log

### 2026-05-02 — bootstrap

- Scaffolded `AGENTS.md`, `CLAUDE.md`, and the `docs/` seven-pack via the `agent-collab-init` skill. Cross-agent review workflow active.
- Next: align the scaffold to the JKO brief (Phase A) before any code.

### 2026-05-03 — M3 complete: FE skeleton (Next.js + Tailwind + next-intl + TanStack Query + openapi-typescript codegen)

Three-commit milestone (chore/feat/feat) per agreed split:

- **M3-A** `chore(M3): scaffold Next.js + Tailwind v4 + next-intl (zh-TW default)` — `create-next-app` with TS strict + Tailwind + App Router + `src/`. next-intl v4 with single-locale (no URL prefix) + zh-TW + en stub dictionaries. JKO-red Tailwind tokens sampled from mockup. ADR-0007 (next-intl) body filled.
- **M3-B** `feat(M3): API client + openapi-typescript codegen + TanStack Query wiring` — codegen pipeline (BE zod → OpenAPI spec → openapi-typescript → FE `paths` interface → openapi-fetch typed client). TanStack Query v5 + ReactQueryDevtools (dev-only). `useSubCategories` and `useItems` hooks. Server-default + client-leaf pattern via `Providers` 'use client' wrapper. `make types` regen target. ADR-0014 (TanStack Query) + ADR-0015 (openapi-typescript codegen) written.
- **M3-C** `feat(M3): / view shell with red header + 3 tabs + functional sub-category dropdown` — AppHeader (server component, JKO-red bar, i18n title), Tabs (client, 3-tab switcher with URL `?tab=` sync, JKO-red underline indicator), SubCategoryDropdown (client, native `<select>` styled with Tailwind, fetches from `/sub-categories?category=`), HomeClient (leaf owning state + URL params), and the page composing them. Search-icon button placeholder (M5 wires it). Card list area placeholder (M4 fills it).

Smoke checks (BE on :3001, FE on :3000):
- `GET /` → `<html lang="zh-TW">`, `<title>所有捐款項目</title>`, three tab labels rendered (`公益團體` / `捐款專案` / `義賣商品`), red header bar, default tab=ORG.
- `GET /?tab=CAMPAIGN&subCategory=緊急救援` → URL params drive client state; renders "Active tab: CAMPAIGN · sub-category: 緊急救援" placeholder text.
- `GET /sub-categories?category=ORG` (via FE devtools query) returns 5 sub-categories from BE; dropdown populates correctly.

Port collision (same as M1's 5432 → 5433 story): on this dev machine port 3000 was held by `frost-template-frontend-1`. Stopped it for the smoke session; `make dev-fe` keeps the convention of port 3000 (so reviewers without that container hit it normally).

ADR slate now: 9 accepted technical (0003-0007, 0010-0015) + 2 process (0001/0002). Way past the brief's "≥3 technical" minimum.

RR-004 written for cross-agent review (per the user's "all meaningful tasks need cross-agent review" rule from the M2 wrap-up).

### 2026-05-02 — M2 hardening pass: production-scale wiring (RR-003)

User pushback on the M2 wrap-up framing ("you shouldn't assume 90 data... assume thousands of ppl calling at the same time, what if more than 10thousands? we are demo but we should showcase what we know and think") prompted a hardening pass over the M2 surface:

- **DB-level:** new migration `20260502153230_add_pg_trgm_gin_search` enables `pg_trgm` and adds GIN indexes on `title` and `description` with `gin_trgm_ops` so `ILIKE '%q%'` is index-backed at scale; drops the old btree indexes which were useless for substring search.
- **Compression:** `@fastify/compress` registered globally (br + gzip, threshold 1024). Verified ~9.9× reduction on Chinese-heavy list payloads (15 KB → 1.5 KB).
- **HTTP cache headers:** `Cache-Control` per route — `s-maxage=3600` on `/sub-categories` (static), `s-maxage=60` on `/items` list, `s-maxage=300` on `/items/:id`. CDN/edge cache becomes effective immediately.
- **Rate limit:** `@fastify/rate-limit` env-tunable (default 100/min/IP), `/health` and `/docs` allowListed. Verified: limit triggers 429 with `retry-after` and `x-ratelimit-*` headers.
- **Request id:** `genReqId` + `onSend` hook surface `x-request-id` on every response for log correlation; incoming ids are regex-validated before reflection.
- **Proxy trust:** `TRUST_PROXY` env-driven and **defaults to `false`** so `req.ip` is the unspoofable socket peer in dev. Production deployments must set `TRUST_PROXY` to a CIDR list / hop count matching the upstream topology — see `docs/SCALING.md` rate-limit section for the deployment matrix.
- **Connection pool:** `DATABASE_URL?connection_limit=10` documented in `.env.example` with tuning guidance for production + PgBouncer notes.
- **Hard Rule 11 added to AGENTS.md:** "Design for production load, not the seed size." Permanent project rule, not a one-off.
- **`docs/SCALING.md` written:** documents what's implemented (6 items) and what's deferred with rationale (Redis cache tier, distributed rate-limit, read replicas, FTS alternative, observability stack, load-test sketch).
- **RISKS.md updated:** R3 reframed honestly; R13 (DB pool exhaustion), R14 (egress payload), R15 (single-client DoS) added.
- All checks green: typecheck, build, 8/8 cursor tests, smoke curls including compression and rate-limit verification.

RR-003 written for cross-agent review (separate from RR-002 which is already in reconfirmation).

### 2026-05-02 — M2 complete: API endpoints + cursor pagination + Swagger

- Added `zod` for query/param validation; later upgraded to schema-based validation via Fastify's route schema mechanism.
- New migration `20260502145445_add_description_index` adds the `description` column index Codex flagged in RR-001 (item §3 of suggestions). Compound index `(category, subCategory, createdAt DESC)` plus title and description indexes give us coverage for every filter the list endpoint uses.
- `backend/src/lib/cursor.ts` encodes/decodes an opaque base64url cursor over `(createdAt, id)`. id is the tiebreaker because the seed inserts in tight succession and many rows share `createdAt`.
- `GET /sub-categories?category=` reads from `backend/src/lib/sub-categories.ts` — no DB hit, just a typed array shaped as `{value, label}` pairs ready for the dropdown.
- `GET /items?category=&subCategory=&q=&cursor=&limit=` filters by category (required), optional subCategory (validated against the constants module), case-insensitive `q` over title+description, applies the cursor as a where-clause OR pair, orders by `(createdAt DESC, id DESC)`, takes `limit + 1` to peek for next page. Returns `{ items, nextCursor }`.
- `GET /items/:id` returns the full item or 404.
- **Added Swagger / OpenAPI in same milestone** via `@fastify/swagger` + `@fastify/swagger-ui` + `fastify-type-provider-zod`. Single source of truth: the same zod schemas drive request validation AND the OpenAPI spec. Swagger UI at `/docs`; raw spec at `/docs/json`. As part of this, refactored all route handlers (including `/health`) to declare schemas via Fastify route options instead of in-handler `safeParse`, and shared response shapes via `backend/src/lib/schemas.ts`.
- Smoke tests passed: pagination (page 1→2 with no overlap, nextCursor null on last page), search (q=流浪動物 → 1 hit), sub-cat filter (ORG+動物保護 → 6 items), detail (campaign with progress fields), 404 on missing id, 400 on bad category/subCategory, Swagger UI loads at `/docs`, OpenAPI 3.0.3 spec at `/docs/json` with `[/health, /items, /items/{id}, /sub-categories]`.
- typecheck + build both clean (per the new "build is a self-check" working agreement from RR-001).
- RR-002 amended in place to cover the Swagger addition (still `awaiting-review`, no reviewer touched it before the addition).
- Next: M3 — FE skeleton (Next.js + Tailwind + next-intl + 3 tabs + functional sub-cat dropdown).

### 2026-05-02 — M1 complete: backend skeleton + DB + seed

- Bootstrapped `backend/` (flat repo: `backend/` + `frontend/`, no monorepo tooling). npm with Fastify v5 + Prisma 6 + tsx for dev hot reload.
- Wrote `docker-compose.yml` at root (Postgres 16-alpine + healthcheck + named volume). **Switched host port to 5433** — another local project's Postgres was already on 5432; updated `.env.example` to match.
- Prisma schema with `Item` table, `Category` enum (`ORG`/`CAMPAIGN`/`MERCHANDISE`), nullable category-specific fields, compound index on `(category, subCategory, createdAt DESC)` and a title index for search.
- Sub-categories live in `backend/src/lib/sub-categories.ts` as the single source of truth (no separate DB table) — the seed reads it and the future `GET /sub-categories` route will too.
- Seed inserts exactly 90 items (30 per category) across 13 sub-categories with realistic Chinese names. Logos: 7 hand-rolled SVGs (heart/paw/leaf/hand/star variants) + 1 placeholder, in `frontend/public/logos/`. ~60% items use a themed logo, ~40% use the placeholder.
- Fastify server boots, registers CORS for `http://localhost:3000`, exposes `GET /health` returning `{ ok, dbConnected }`. Smoke test: `curl localhost:3001/health` → `{"ok":true,"dbConnected":true}`.
- Added `Makefile` at root for one-command bring-up: `make setup` does install + db-up + wait-db + migrate + seed; `make dev` boots Fastify; `make reset` nukes the DB volume and rebuilds.
- Next: M2 — implement `GET /items` (with category + subCategory + q + cursor), `GET /items/:id`, `GET /sub-categories`.

### 2026-05-02 — Phase A complete: scaffold aligned to brief

- Read the JKO brief (charity-donation listing with infinite scroll + search) and the four UI mockup screenshots.
- Locked in stack decisions: Next.js + Fastify + Prisma + Postgres (docker locally / Neon for demo) + Tailwind + `next-intl` + react-window. Deploy: Vercel (FE) + Railway (BE) + Neon (DB).
- Migrated `docs/DECISIONS.md` (single file) → `docs/decisions/` (folder) per the brief's named path. 2 process ADRs (0001/0002) migrated; 7 technical ADR stubs created (0003–0009) to be filled at the corresponding milestones.
- Replaced `<!-- TODO -->` placeholders in `AGENTS.md` Hard Rules, `docs/REQUIREMENTS.md` (full acceptance checklist A–F), `docs/PROGRESS.md` milestones, and `docs/RISKS.md` (R1–R12).
- Annotated `docs/AI_JOURNAL.md` with the M9 rename note so a future session doesn't accidentally pre-create `docs/prompts/`.
- Next: M1 — Fastify + Prisma + Postgres skeleton with seed.
