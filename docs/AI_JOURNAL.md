# AI Collaboration Journal

> **At M9 (final prep) this file is renamed/restructured to `docs/prompts/`** to
> match the assignment's required layout (the brief names `/docs/prompts/`
> explicitly as the prompt-records folder). Until M9, append exchanges here
> — do not pre-create `docs/prompts/` or you'll end up with two parallel logs.

A running log of meaningful AI exchanges during this project. Append entries
**during** sessions, not retroactively. Sanitize as needed but don't fabricate.

What's worth logging:

- Course corrections (the AI proposed X, we did Y, here's why)
- Hallucinations caught and fixed (especially on niche / recent APIs)
- Prompt engineering wins (a phrasing that consistently produced better output)
- Domain learning moments (the AI explained a concept that unblocked you)
- Human override moments (where you rejected AI advice and it mattered)
- Hard problems decomposed across multiple sessions

What's NOT worth logging:

- Routine tab-completion-style help
- Successful AI suggestions that did exactly what you'd have written anyway
- Mechanical refactors

## Entry template

```md
### YYYY-MM-DD — short title — agent: Claude | Codex

**Context.** What were we trying to do?
**Exchange.** What was asked / suggested / corrected. Quote actual prompts
and responses where instructive.
**Outcome.** What we kept, what we rejected, why.
**Lesson.** (optional) Generalizable takeaway.
```

---

## Log

<!-- Append new entries below, newest at the bottom. -->

### 2026-05-02 — bootstrap — agent: Claude

**Context.** Spinning up interview-jopay. Wanted the same dual-agent
review workflow we used on prior projects.

**Exchange.** Invoked the `agent-collab-init` skill to scaffold
`AGENTS.md` + `docs/` seven-pack. Skill asked for project name, stack,
and whether AI collaboration is graded.

**Outcome.** Scaffolded. `<!-- TODO -->` markers flag where domain-specific
rules and risks need to be authored before the first real session.

**Lesson.** N/A (process).

### 2026-05-02 — Phase A: align scaffold to JKO brief — agent: Claude

**Context.** Right after bootstrap I had a generic agent-collab scaffold;
the JKO brief and four UI mockup screenshots arrived next. Needed to translate
the brief into concrete Hard Rules, acceptance criteria, milestones, risks —
and reshape `docs/DECISIONS.md` into a `docs/decisions/` folder because the
brief explicitly names that path.

**Exchange.** I drafted a plan in plan-mode listing the deltas (folder rename,
TODO replacements, design-derived API shape) and asked four scope-affecting
questions via AskUserQuestion: tab scope, sub-filter functional vs stub, card
detail page, mobile/desktop responsiveness. User answered: all 3 tabs;
sub-filter functional with BE support; assume scaling so use react-window;
detail page yes; mobile-first + responsive; restore tab+scroll on cancel;
i18n with zh-TW default; Railway for BE deploy; tests in scope. User also
clarified the prompt-records strategy: keep `docs/AI_JOURNAL.md` as the live
log during dev and rename to `docs/prompts/` only at M9.

**Outcome.** Phase A executed: 9 ADRs in `docs/decisions/` (2 process accepted,
7 technical proposed); Hard Rules in `AGENTS.md` rewritten with 10 concrete
project-specific rules; `REQUIREMENTS.md` filled with criteria A–F (matching
the four mockup screens); milestones M0–M9 with critical-path order; risk
register R1–R12 including the new design-derived risks (search race,
react-window variable-height, restore-on-refresh, hotlinked logos).

**Lesson.** The four mockup screenshots arrived after the initial brief and
materially changed the data model (single `Item` table with category enum +
nullable category-specific fields; sub-category as a real filter; detail page
needed) — worth re-running the requirements pass when new design artifacts
land, not assuming the v1 plan stands.

### 2026-05-02 — M1: backend skeleton + seed — agent: Claude

**Context.** Implementing M1 (BE + DB + seed) per the approved plan. User
wanted a flat repo and a Makefile for easy reviewer bring-up.

**Exchange.** Two notable decision points:
1. *Sub-categories storage.* Plan said "free-form within a category" but the
   `GET /sub-categories` endpoint needs a deterministic source. Options were
   a separate `SubCategory` table (more "correct") or a TS constants module.
   Picked the constants module — for an interview project this avoids a
   second migration and gives a single import path that both the seed and
   the future route handler use.
2. *Port collision.* `docker compose up` failed because another project's
   Postgres was already on 5432 (`frost-template-postgres-1`). Rather than
   asking the user to kill the other container, switched the host-side
   binding to `5433:5432` and updated `.env.example` accordingly. Documented
   the reason inline in the compose file.

**Outcome.** 90 items seeded (30 per category × 13 sub-categories). `/health`
returns `{ ok: true, dbConnected: true }`. `make setup` runs install →
docker → wait-db → migrate → seed end-to-end, so the next reviewer (human or
agent) can clone and be running in one command.

**Lesson.** Defensive port mapping (5433:5432 with a comment) costs nothing
upfront and saves the next person from the same collision. Worth doing
proactively in any docker-compose for a multi-project machine.

### 2026-05-02 — M2: API endpoints + cursor pagination + Swagger — agent: Claude

**Context.** Implementing M2 per REQUIREMENTS §5.D / §4. Three endpoints
(`GET /items`, `GET /items/:id`, `GET /sub-categories`) plus the
`description` index Codex flagged in RR-001. No spec on validation strategy
or API documentation, so picked both before writing.

**Exchange.** Three design points worth pinning, in the order they were
made (the validation choice was reopened mid-milestone when the user asked
for Swagger support):

1. *Validation library — initial choice.* Considered Fastify's built-in
   JSON schema (zero deps, less type-safe), `@fastify/type-provider-typebox`
   (two deps, compile-time-typed routes), and zod with manual parsing in
   handlers (one dep, idiomatic in modern TS). Initially picked zod with
   manual `safeParse` in each handler — single dep, handlers stay readable.
   *Did not* wire a type provider yet.

2. *Cursor design.* `createdAt` alone isn't enough because the seed inserts
   30 items per category in milliseconds — many rows share a timestamp.
   Compound `(createdAt, id)` cursor with the OR-clause:
   `createdAt < c.createdAt OR (createdAt = c.createdAt AND id < c.id)`,
   ordered `(createdAt DESC, id DESC)`. Verified against the seed: page 1
   (20 items) and page 2 (10 items) don't overlap, nextCursor=null on the
   last page. Encoded as base64url JSON so it survives URL transit. ADR-0006
   captures the full reasoning (filled in retroactively after Codex's RR-002
   review flagged the empty stub).

3. *Validation library — revised choice after the Swagger ask.* When the
   user requested Swagger/OpenAPI inside M2, the cleanest path was to make
   request validation and the OpenAPI spec share one source of truth.
   Switched to `fastify-type-provider-zod` + `@fastify/swagger` +
   `@fastify/swagger-ui`. This let me delete every manual `safeParse` and
   move validation to Fastify's route `schema` field; the same zod schemas
   now drive both runtime validation **and** the OpenAPI doc at `/docs/json`
   (UI at `/docs`). Side-effect: `400` shapes diverge — schema-level
   failures come back Fastify-shaped, while semantic failures (invalid
   `subCategory` for the chosen category, malformed cursor) keep custom
   shapes from the handler. Codex flagged this as worth documenting and I
   agree.

**Outcome.** All three endpoints + Swagger UI + OpenAPI 3.0.3 spec land,
plus the description index. Pagination, search, sub-cat filter,
detail-with-404, structured 400s, `/docs`, and `/docs/json` all verified
via curl. Self-check checklist: typecheck + build + 12 curl flows (per the
"build is a self-check" working agreement from RR-001). RR-002 written
immediately, not chat-mentioned (per the "Review request is a written
artifact" working agreement from RR-001).

**Lesson.** Two of M1's lessons paid off in M2: writing the Review request
artifact up front (no user reminder needed this time), and running the
build alongside typecheck (caught nothing this time but now habit). The
cursor design lesson is the keepable one: most "use createdAt as cursor"
tutorials assume time-spread inserts; seed scripts collapse timestamps and
silently produce duplicate-key bugs. Always pair the time field with a
stable tiebreaker.

Process lesson from this entry's *correction*: when scope changes
mid-milestone (here, Swagger added on top of the already-shipped routes),
update the journal entry in the same turn — leaving stale "we picked X"
narration ahead of "we actually shipped Y" makes the AI-collaboration
artifact misleading. Codex caught this in RR-002.

### 2026-05-03 — M2 hardening: production-scale push + Codex's spoofability catch — agent: Claude

**Context.** After M2's API endpoints + Swagger landed, I framed scaling
and caching as optional "M9 polish, anchored on '90 rows = no bottleneck.'"
The user pushed back hard:

> "hey you shouldn't assume 90 data, pls assume there will be thousands of
> ppl calling at the same time, 90 its for mock purpose, what if more then
> 10thousands? we are demo but we should showcase what we know and think"

That reframed the whole milestone. Not "add caching if cheap" but "design
for production load by default; demo is no excuse to skip showcase-level
thinking." Saved as a permanent project rule (memory:
`feedback_design_for_production_scale.md`) and added as
**AGENTS.md Hard Rule 11**.

**Exchange — what got built (RR-003 round 1).** Six concrete items,
chosen as the cheap-real-production-grade subset:

1. `pg_trgm` GIN migration — replaces useless btree title/description
   indexes; `ILIKE '%q%'` becomes index-backed at scale.
2. `@fastify/compress` — br + gzip + 1KB threshold. Verified ~10× reduction
   on Chinese-heavy list payloads.
3. `Cache-Control` per route — aggressive on `/sub-categories` (deploy-bound
   TTL), short on `/items` list, medium on `/items/:id`.
4. `@fastify/rate-limit` — env-tunable, allowList for `/health` and `/docs`.
5. `connection_limit` env knob on `DATABASE_URL` with PgBouncer guidance
   in `docs/SCALING.md`.
6. `x-request-id` header surfaced via `genReqId` + `onSend` hook.

Plus `docs/SCALING.md` documenting what was *deferred* with rationale
(distributed rate-limit state, Redis hot-read tier, read replicas, FTS
alternative, observability stack, load-test sketch).

**Codex's catch — adversarial vs functional smoke.** I shipped
`trustProxy: true` to "surface real client IP behind LB" and verified the
rate limit by hammering `/sub-categories` 8 times (first 5 = 200, last 3
= 429). Functional smoke green. Codex independently tested with three
different `X-Forwarded-For` values per request: all 200. **The rate limit
was bypassable** — any direct client could mint a fake IP per request.

This is the most important Codex catch of the project so far because:

- I had functional verification ("limit triggers under load").
- I did not have **adversarial** verification ("limit can't be bypassed").
- The two answer different questions, and security-relevant code requires
  both.

Saved as a separate feedback memory:
`feedback_adversarial_smoke_for_security_code.md`. Generalizes beyond
this project — any rate-limit / auth / CORS / header-trust work needs
the bypass attempt as part of self-check.

**Fix — RR-003 round 2.** `TRUST_PROXY` is now env-driven and **defaults
to `false`**. Production deployers behind a known proxy topology must
opt in (`TRUST_PROXY=1` for Railway, `TRUST_PROXY=2` for Cloudflare→Railway,
or a CIDR list). Documented as a deployment matrix in `docs/SCALING.md`.
Locked in by `backend/src/spoof-resistance.test.ts` — one suite asserts
the safe default rejects spoof, a *second* suite deliberately demonstrates
the historical bypass under `TRUST_PROXY=true` so any future regression
surfaces immediately.

Codex's round-2 reconfirmation also caught: stale `trustProxy: true` text
in `docs/SCALING.md` "Request correlation" section and `docs/PROGRESS.md`
M2-hardening log line. Both rewritten. CIDR validation in
`backend/src/lib/env.ts` was tightened so bad input fails fast at boot
with a structured error (not a deep `proxy-addr` parser stack later).

**Subplot — env caching bug surfaced by writing the test.** First cut of
`spoof-resistance.test.ts` failed because `app.ts` had
`const env = loadEnv()` at module-import time — `_resetEnvCacheForTesting()`
cleared the inner cache but the module-level `env` constant in `app.ts`
was already frozen. Refactored `app.ts` to call `loadEnv()` *inside*
`buildServer()`, moved `PORT`/`HOST` to read directly in `server.ts`. Test
suite started passing (and would have shipped a latent test-isolation bug
without it).

**Round 3 verdict (2026-05-03):** `approved` by Codex with two bookkeeping
suggestions and one acknowledged nit. RR-003 closed.

**Today's Q&A — crystallizing the decisions.** After RR-003 closed, the
user asked six concrete technical questions about the scaling/security
work just shipped:

1. Does `pg_trgm` GIN actually work for Chinese? *(Yes, with the 3-char
   trigram threshold caveat — see ADR-0010.)*
2. Why cursor pagination over `OFFSET`? *(OFFSET drifts under concurrent
   writes + O(N) cost; cursor's compound key + OR-partition stays correct
   under writes — see ADR-0006 + LEARNING_NOTES §4.)*
3. What's `TRUST_PROXY`? *(Who do we trust to set X-F-F; default off because
   the wrong setting is silent — see ADR-0011 + LEARNING_NOTES §5.)*
4. What's `genReqId` for? *(Per-request correlation id; surfaced as
   `x-request-id` header so user-reported bugs trace to one log line.
   Regex-validated to prevent log poisoning.)*
5. Is `Cache-Control` standard, and how do I bust on data change?
   *(Standard per RFC 9111; three invalidation patterns — purge on
   deploy, URL versioning, surrogate keys / Cache-Tags — see ADR-0012.)*
6. So we don't need Redis? *(Right, for our access pattern. Redis is
   deferred with explicit reactivation triggers in SCALING.md — see
   ADR-0012 + LEARNING_NOTES §6.)*

Walking through these turned conversational explanations into four new
ADRs (0010–0013), four new LEARNING_NOTES sections (§3–§6), and
back-filled bodies for ADR-0003/0004/0005 (M1 decisions whose stubs were
still empty). The Q&A wasn't just teaching — it was a forcing function
to spot which decisions weren't yet documented.

**Outcome.** RR-003 approved; M2 done. ADR slate is now 13 entries, of
which 11 are technical (Hard Rule 5 satisfied many times over). Memory
got two new entries: `design for production scale` and `adversarial smoke
for security code`. AGENTS.md Hard Rule 11 makes the production-scale
framing permanent for any future scope decision on this project.

**Lessons (durable):**

- **Demo ≠ "skip the production thinking."** The user reset my framing
  to "showcase what we know" — the right default for any interview build.
- **Functional smoke alone is insufficient for security code.** Always
  pair with an adversarial smoke (try to bypass).
- **Q&A drives decision-doc completeness.** When the user asks
  "explain X to me," the right move isn't just to explain — it's to
  also write the ADR/LEARNING_NOTES for X if they don't already exist,
  while the explanation is fresh.
- **Module-level env reads block test isolation.** `loadEnv()` at module
  import time caches before tests can mutate. Push env reads into the
  factory function, not the module top.

### 2026-05-03 — M3: FE skeleton (Next.js + TanStack + codegen) — agent: Claude

**Context.** M3 is the FE foundation per REQUIREMENTS §5.A: red-header
shell with 3 tabs + functional sub-cat dropdown, ready for M4 to fill the
card list. User picked the stack ahead of time (Next.js + Tailwind +
next-intl + TanStack Query + openapi-typescript codegen) so this was
mostly execution + a few real design choices that became ADRs.

**Exchange.** Three decisions worth pinning:

1. *FE↔BE type sharing strategy.* Considered three: hand-redeclare types
   in FE (drift), shared monorepo package (overkill for flat repo +
   workspace tooling we don't have), or codegen from the OpenAPI spec
   (`openapi-typescript`). Picked codegen because the BE already produces
   `/docs/json` from zod schemas (ADR-0013), so the BE→FE type pipeline
   has zero hand-maintained step. ADR-0015. Make target `make types`
   regenerates `frontend/src/lib/api-types.ts` from the running BE.

2. *Server-component default + client-at-leaf pattern.* App Router gives
   server components by default, but TanStack Query and URL-state hooks
   must be client. The clean answer: `app/page.tsx` is a server component
   that renders `<AppHeader />` (server) + `<HomeClient />` ('use client'
   leaf). All client-only state lives in `HomeClient`; the i18n title
   ships in the SSR HTML for free.

3. *Cache-Control + FE story coupling.* The BE sets aggressive cache on
   `/sub-categories` (s-maxage=3600, ADR-0012). TanStack Query's
   `staleTime: 5min` + the BE Cache-Control means `useSubCategories(category)`
   is a single network round-trip per category per session. No new cache
   layer needed in the FE.

**Outcome.** Three M3 commits (chore A → feat B → feat C). Smoke green:
lang="zh-TW", title from i18n dict, three tab labels visible, URL `?tab=`
and `?subCategory=` drive state correctly. Port-collision recurrence —
another project's `frost-template-frontend-1` holds 3000 on this dev
machine; stopped temporarily for smoke. Kept FE convention on 3000 so
reviewers without that container get the standard URL.

**Lesson.** The codegen pipeline pays off the moment it exists. FE call
sites get narrowed return types automatically — no drift surface. The
manual `make types` step is the only friction; M9 will add a CI check
(`make types && git diff --exit-code`) so a stale committed types file
fails the build.

### 2026-05-03 — M4: card list + react-window virtualization + infinite scroll — agent: Claude

**Context.** M3 left `/` as a working shell with empty card area; M4 fills
it with the actual virtualized card list per REQUIREMENTS §5.A and
ADR-0008.

**Exchange.** Three real decisions:

1. *react-window v2 API change.* @types/react-window targets v1
   (`<List itemSize>`); v2.2 is a rewrite with `<List rowComponent
   rowHeight rowProps>` and ships its own types. Removed the wrong
   types package after install. v2 also handles parent measurement via
   ResizeObserver internally — no need for AutoSizer-style wrappers.

2. *Infinite-scroll trigger via `onRowsRendered`, not IntersectionObserver.*
   react-window v2's `onRowsRendered` callback fires with `{ startIndex,
   stopIndex }` whenever the visible window shifts. Triggering
   `fetchNextPage()` when `stopIndex >= items.length - 5 && hasNextPage`
   is one line; an IntersectionObserver sentinel inside a virtualized
   row would have been fragile because the row only mounts when in
   view. Picked the simpler path.

3. *Stray Prisma migration nearly DROPped the GIN indexes.* Earlier in
   the session a `prisma migrate dev` ran (autoamted, hung, restarted)
   and Prisma auto-generated a migration that would `DROP INDEX
   Item_title_trgm_idx` + `Item_description_trgm_idx`. Reason: those
   indexes are in a raw-SQL migration (`add_pg_trgm_gin_search`), not
   declared in `schema.prisma` (Prisma DSL can't express GIN +
   gin_trgm_ops). Prisma sees "drift" between schema (no indexes) and
   DB (has indexes) and "fixes" by dropping. Caught the stray folder
   before commit; M4-A adds three layers of defense:
   - Strong comment in schema.prisma
   - Makefile `migrate` switched to `--create-only` (review-required)
   - New `migrate-apply` target for the apply step

**Outcome.** Two M4 commits (chore A + feat B). FE typecheck + production
build clean. BE smoke unchanged (no BE code in M4 — only schema comment
+ Makefile target rename). Cards render client-side via TanStack
useInfiniteQuery; mockup chrome (fixed card height, logo + title +
clamped desc) matches.

**Lesson.** The Prisma + Postgres-extension-index combo is a known
sharp edge but it bit us specifically because `prisma migrate dev` is
the muscle-memory command. Switching the Makefile target to
`--create-only` makes it visible in the SQL diff before it hits the
DB. Generalizes to: any time the schema source-of-truth (Prisma DSL)
can't express something the runtime DB has (custom extensions, partial
indexes, materialized views, etc.), the migration tool will keep
trying to "correct" the drift in the wrong direction. Either fight it
upstream (ignore-list features as they exist) or change the workflow
(--create-only review gate).
