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

