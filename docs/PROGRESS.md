# Progress Log

A running, append-only-ish log of where we are. Don't be ceremonial — just keep
it current. Format per entry: date, what changed, what's next, blockers.

## Status snapshot

- **Phase**: M1 complete + RR-001 `approved` by Codex CLI. Ready for M2 (API endpoints) on user go-ahead.
- **Last updated**: 2026-05-02
- **Branch**: main (git initialized; baseline commit `4df3baf init`)

## Milestones

Critical-path: M1 → M2 → M3 → M4 → M5 → M6 → M8. Tests (M7) and final prep (M9) can run alongside or after the deploy. Demo URL (M8) is mandatory; never cut.

| #   | Milestone                                                                                                                                | Status   |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| M0  | Repo scaffolding + agent-collab docs                                                                                                     | done     |
| M1  | BE skeleton: Fastify + TS + Prisma `Item` schema (`category` + `subCategory` enums + nullable category-specific fields) + Postgres + seed (≥90 items, real logos for some) | done    |
| M2  | API endpoints: `GET /items` (category + subCategory + q + cursor) + `GET /items/:id` + `GET /sub-categories`                             | pending  |
| M3  | FE skeleton: Next.js App Router + Tailwind + `next-intl` (zh-TW) + responsive shell; `/` view with red header + 3 tabs + functional sub-category dropdown | pending |
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
