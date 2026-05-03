# Learning Notes — interview-jopay

Topical notes on concepts learned during this project. **Organized by topic,
not chronologically** — easier to flip back to. Each section should link to
the code path it explains so you can jump back to the source.

This file complements `AI_JOURNAL.md`:

- `AI_JOURNAL.md` = the *exchange* (what you asked, what the AI said, what
  changed). Chronological. Useful as a paper trail and for the AI
  collaboration grading dimension.
- `LEARNING_NOTES.md` = the *understanding* (the concept itself, written
  down once you grok it). Topical. Useful for revisiting a tricky idea
  without re-reading 30 chat turns.

## When to add to this file

- You just understood something non-obvious that took >1 session to figure out.
- You hit a subtle bug whose root cause is a concept you didn't have before.
- You picked an approach where the *why* would be hard to reconstruct from
  the code alone (an invariant, an algebraic argument, a trade-off).
- You explained something to the AI and want a written reference for next
  time.

What NOT to put here:

- Anything already documented in the source / official docs (link to them
  instead).
- Architectural decisions — those go in `decisions/` as ADRs.
- Risk mitigations — those go in `RISKS.md`.
- Step-by-step how-tos — those go in the README.

## Section template

```md
## N. <topic title>

<2-4 paragraphs. Lead with the takeaway in plain English; only then drill
into the mechanism. Add code references with `path/to/file.ext:line` so
future-you can jump back.>

**Code:** `backend/foo/src/bar.rs:42`, `frontend/components/Baz.tsx:88`
**See also:** `decisions/NNNN-*.md`, `RISKS.md` R-NNN.
```

---

## Table of contents

<!-- Update as sections are added. -->

1. [Defensive Docker host-port mapping for multi-project dev machines](#1-defensive-docker-host-port-mapping-for-multi-project-dev-machines)
2. [Why typecheck and build can both pass and the build can still be wrong](#2-why-typecheck-and-build-can-both-pass-and-the-build-can-still-be-wrong)
3. [`pg_trgm` trigram threshold under CJK substring search](#3-pg_trgm-trigram-threshold-under-cjk-substring-search)
4. [Cursor pagination — compound key + OR-clause partition](#4-cursor-pagination--compound-key--or-clause-partition)
5. [`trustProxy` and the X-Forwarded-For spoofing trap](#5-trustproxy-and-the-x-forwarded-for-spoofing-trap)
6. [HTTP `Cache-Control` vs Redis — when each one wins](#6-http-cache-control-vs-redis--when-each-one-wins)
7. [Prisma + Postgres extension drift — `prisma migrate dev` will silently DROP what its DSL can't express](#7-prisma--postgres-extension-drift--prisma-migrate-dev-will-silently-drop-what-its-dsl-cant-express)

---

## 1. Defensive Docker host-port mapping for multi-project dev machines

If a service has a famous default port (Postgres 5432, Redis 6379, MySQL 3306, MongoDB 27017), other projects on the same dev machine probably also use it. `docker compose up` will fail with `Bind for 0.0.0.0:PORT failed: port is already allocated` and the next person hits the same wall.

**Lesson:** for any compose file that targets a famous-default port, **shift the host side by one** and document why inline. The container side keeps the canonical port (so internal connection strings, docs, and Prisma's expectations all stay normal); only the host-side mapping changes. Cost: one line of YAML and one line in `.env.example`. Benefit: the next reviewer on a multi-project laptop runs `make setup` once and it just works.

```yaml
ports:
  # Host 5433 → container 5432. Host port shifted because another local
  # Postgres (e.g. another project's docker) commonly squats on 5432.
  - "5433:5432"
```

**Code:** [docker-compose.yml](../docker-compose.yml), [.env.example](../.env.example)
**See also:** AI_JOURNAL.md M1 entry (where this came up); RR-001 in REVIEWS.md (Codex agreed and recommended keeping the shift).

---

## 2. Why typecheck and build can both pass and the build can still be wrong

`tsc --noEmit` (typecheck) and `tsc` (build) can disagree even when both succeed individually:

- **Different include scopes.** This project has two configs: `tsconfig.json` for build (rootDir: `src/`, include: `src/**/*`) and `tsconfig.check.json` for typecheck (rootDir: `.`, include: `src/**/*` + `prisma/**/*.ts`). The seed script (`prisma/seed.ts`) is checked but never built. If you only run `npm run typecheck`, you can ship a build that fails for files only the build config sees — and vice versa.
- **Emit-time vs check-time errors.** Some errors only surface during emit: declaration generation, module resolution that needs to find a file path, target/lib mismatches that affect output but not type analysis.

**Lesson:** before posting a Review request, run **both** `npm run typecheck` and `npm run build`. They are not redundant. Codex caught this gap in RR-001 by running the build during reconfirmation.

**Code:** [backend/tsconfig.json](../backend/tsconfig.json), [backend/tsconfig.check.json](../backend/tsconfig.check.json), [backend/package.json](../backend/package.json)
**See also:** REVIEWS.md RR-001 reconfirmation block; AGENTS.md "Working agreements" → "Pre-review self-checks must include build".

---

## 3. `pg_trgm` trigram threshold under CJK substring search

Postgres `pg_trgm` GIN indexes make `ILIKE '%q%'` index-backed by indexing every 3-character window (trigram) of every text-column value. The planner extracts trigrams from the search term and looks them up in the GIN.

**The catch:** if the search term is shorter than 3 characters, the planner *cannot extract a trigram* and falls back to a full sequence scan. For English this rarely matters (most queries are 3+ chars). For Chinese it shows up immediately:

| Query | Trigram count | Index used? |
|---|---|---|
| `cat` | 1 (`cat`) | ✅ |
| `流浪` (2 chars) | 0 | ❌ seq scan |
| `流浪動` (3 chars) | 1 (`流浪動`) | ✅ |
| `流浪動物` (4 chars) | 2 (`流浪動`, `浪動物`) | ✅ stronger filter |

`pg_trgm` is *character-trigram*, not word-trigram. There's no tokenizer pass; it just slides a 3-codepoint window. So Chinese works as-is — but bounded by that 3-char floor.

For real-world Chinese-search systems where 1- or 2-character queries matter, the path is **Postgres FTS with a CJK tokenizer** (`pg_jieba` / `zhparser`). FTS does word-level matching so `動` matches `動物`. Caveat: `pg_jieba` requires a custom Postgres image; not available on Neon free tier as of writing.

**Lesson:** when picking a search backend, compute the index threshold against your *user's actual query length distribution*, not the average English query.

**Code:** [backend/prisma/migrations/20260502153230_add_pg_trgm_gin_search/migration.sql](../backend/prisma/migrations/20260502153230_add_pg_trgm_gin_search/migration.sql)
**See also:** ADR-0010, `docs/SCALING.md` "Postgres FTS as alternative to `pg_trgm`".

---

## 4. Cursor pagination — compound key + OR-clause partition

Naive cursor pagination uses a single column (`createdAt > cursor`). It works **only** when that column is unique. Once two rows share the value, you either skip a row (`>`) or duplicate one (`>=`). In production any millisecond-clock column collides regularly; in our seed script *all 30 items per category* share `createdAt` because the inserts run within one millisecond.

The fix is a **compound cursor** with a deterministic tiebreaker. We use `(createdAt, id)`. The where clause has to express "tuple strictly less than the cursor" (in our DESC-ordered case) without using a tuple operator (Prisma doesn't generate one). The math:

```
"items strictly after (c.createdAt, c.id) in DESC order"
  ≡ createdAt < c.createdAt
    OR (createdAt = c.createdAt AND id < c.id)
```

These two clauses **partition** the "after" space — non-overlapping (no row can satisfy both: the first requires `createdAt < c.createdAt`, the second requires `createdAt = c.createdAt`) and exhaustive (every row strictly less than the tuple satisfies one of them). No row appears in two pages, no row is skipped.

In Prisma:

```ts
where: {
  OR: [
    { createdAt: { lt: c.createdAt } },
    { createdAt: c.createdAt, id: { lt: c.id } },
  ],
},
orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
take: limit + 1,  // peek one extra to detect "has next"
```

**Generalization:** for any cursor-pagination over an index `(A, B)` (or longer), the OR clause has `len(key)` branches:

```
A < cA
OR (A = cA AND B < cB)
OR (A = cA AND B = cB AND C < cC)
...
```

Each branch fixes one more equality and strictly orders the next column. The result still partitions the "after" space.

**Lesson:** cursor pagination is correct iff the cursor key is a strict total order over the rows. A single non-unique column is a bug waiting to happen; pair it with a tiebreaker (PK is always available) the moment you write the cursor.

**Code:** [backend/src/lib/cursor.ts](../backend/src/lib/cursor.ts), [backend/src/routes/items.ts](../backend/src/routes/items.ts)
**See also:** ADR-0006, [backend/src/lib/cursor.test.ts](../backend/src/lib/cursor.test.ts) (8 tests including ms-tie preservation).

---

## 5. `trustProxy` and the X-Forwarded-For spoofing trap

When a Node service runs behind a load balancer, the socket peer is the LB, not the real client. To recover the real client IP, frameworks read `X-Forwarded-For` (set by the LB). But:

> **Any direct client can also set `X-Forwarded-For`. The header is not a credential.**

Trust must be deployment-aware. Fastify's `trustProxy` option encodes who you trust to set forwarded headers. The settings:

| `trustProxy` | What `req.ip` becomes | Spoof-resistant? |
|---|---|---|
| `false` (default) | socket peer | ✅ Yes — header is ignored |
| `true` | leftmost X-F-F | ❌ No — anyone can set the header |
| `<integer N>` | X-F-F[-N-1] (N hops trusted) | ✅ if N matches reality |
| `<CIDR list>` | X-F-F if request came from listed peer | ✅ tightest |

The trap: **`trustProxy: true` looks reasonable** ("we're behind a proxy, of course we trust it") but only works if **no path lets a client bypass the LB**. If you can `curl` the BE directly (a stray exposed port, an internal-only service that's accidentally public, a misconfigured ingress), `trustProxy: true` lets that client set `X-F-F` to any value and look like any IP. Per-IP rate limiting becomes useless because every request can claim a fresh "IP."

**The right default is `false`.** Production deployers opt in to a value that matches their topology — Railway-only is `1`, Cloudflare→Railway is `2`, named CIDR is the strictest.

**Detection:** adversarial smoke test, not functional. With rate limit `max=2`:
- Functional test (3 requests, no headers): pass at 2, fail at 3 — limit triggers ✓
- Adversarial test (3 requests with three different `X-F-F`): fail at 3 means safe; pass on all 3 means the limit is bypassable.

The functional test alone passes with EITHER setting; only the adversarial test catches the broken case.

**Lesson:** any header that "tells the framework who the client is" is a credential. Treat untrusted-by-default. For rate limit / auth / IP allowlist work, the smoke test must include a spoof attempt — not just a hit-the-limit test.

**Code:** [backend/src/lib/env.ts](../backend/src/lib/env.ts) `TrustProxySchema`, [backend/src/spoof-resistance.test.ts](../backend/src/spoof-resistance.test.ts)
**See also:** ADR-0011, `docs/SCALING.md` rate-limiting deployment matrix.

---

## 6. HTTP `Cache-Control` vs Redis — when each one wins

Two caching tiers, often confused. They serve different access patterns:

| | HTTP Cache-Control + CDN | Redis (hot-read tier) |
|---|---|---|
| **Where it lives** | At the edge / browser, between client and origin | Inside the BE, between handler and DB |
| **Cache key** | URL + headers | Whatever the BE chooses (usually composite) |
| **Hit serves** | Without origin invocation | With origin invocation but no DB call |
| **Per-user content** | ❌ Leaks between users (unless `private`) | ✅ Easy with user-id key |
| **Auth-required endpoints** | ❌ CDN can't see auth state | ✅ BE controls cache lookup |
| **Multi-replica state** | N/A — CDN is shared | ✅ Across replicas (rate limit, sessions) |
| **Sub-second TTL** | ❌ Edge propagation delay | ✅ Native |
| **Cache invalidation** | URL purge / Cache-Tag / URL versioning | Direct `DEL` |
| **Cost** | $0 — included in CDN | Provision + operate Redis |

**Order of preference:**

1. **No caching** — for endpoints that are already fast (in-memory map, indexed lookup), caching adds operational cost with no measurable win.
2. **HTTP `Cache-Control` + CDN** — for public, deterministic-in-TTL responses. `s-maxage` lets CDN cache; `max-age` lets browser cache; both for free.
3. **Redis hot-read tier** — only when (1)+(2) can't apply: per-user, auth-required, multi-replica state, or sub-second TTL.

Adding Redis "because cache" without checking the access pattern is over-engineering: doubles the moving parts (provision, monitor, TTL tune, evict) for no benefit if a `Cache-Control` header would have done the same work.

**For our project (M2):** all read endpoints are public. CDN with `Cache-Control` covers `/sub-categories` (deterministic, deploy-bound TTL), `/items` list (short TTL absorbs same-query bursts), and `/items/:id` (stable per id). Redis would duplicate effort. Documented as deferred in `docs/SCALING.md` with explicit reactivation triggers.

**Lesson:** before reaching for Redis, ask "can this be a `Cache-Control` header?" The answer is yes more often than people think.

**Code:** [backend/src/routes/items.ts](../backend/src/routes/items.ts), [backend/src/routes/sub-categories.ts](../backend/src/routes/sub-categories.ts)
**See also:** ADR-0012, `docs/SCALING.md` "Hot-read caching tier (Redis)" + "Distributed rate-limit state".

---

## 7. Prisma + Postgres extension drift — `prisma migrate dev` will silently DROP what its DSL can't express

Prisma's schema DSL doesn't cover several common Postgres features:

- GIN / GiST / BRIN indexes (only btree)
- Operator classes like `gin_trgm_ops`, `gin_jsonb_ops`
- Partial indexes (`WHERE deleted_at IS NULL`)
- Expression indexes (`ON (lower(email))`)
- Materialized views, foreign data wrappers, custom collations
- Anything from extensions (`pg_trgm`, `pg_jieba`, `postgis`, …)

If you need any of these, the workaround is a hand-written raw-SQL migration. **Trap:** `prisma migrate dev` then sees the live DB has an object the schema doesn't declare, calls it "drift," and auto-emits SQL to **drop it**. Apply that migration and your raw-SQL work is silently undone.

The failure mode is invisible at runtime. Tests pass, API responds, only some perf characteristic regresses (a search that was index-backed becomes a seq scan; a JSONB query that was sub-millisecond becomes hundreds of ms). Without an explicit perf test you find out in production.

This bit us in M2 — `prisma migrate dev` generated a migration that would `DROP INDEX Item_title_trgm_idx` + `Item_description_trgm_idx`, both managed by the raw-SQL `add_pg_trgm_gin_search` migration that landed our Chinese-search performance work. Caught the stray migration folder before commit; M4 added three layers of defense:

1. **Prominent warning comment in `schema.prisma`** — anyone editing the schema sees the rule before they reach for `prisma migrate dev`.
2. **`make migrate` rewired to `--create-only`** — the muscle-memory command no longer applies. It generates the migration SQL and prints "review the file before applying."
3. **New `make migrate-apply` target uses `prisma migrate deploy`** — non-interactive apply, only after the diff is human-reviewed. `make setup` (clone-to-running) calls migrate-apply so first-time installs apply existing migrations without ever generating new ones.

The pattern that broke is fully general: **any time the schema source-of-truth (Prisma DSL, sqlc YAML, drizzle ts, …) can't express a DB feature you need, the migration tool will keep trying to delete it**. Possible escape hatches by tool:

- Prisma: `--create-only` review gate (this project), or watch for `@@ignore` / unsupported-feature attributes if your version supports them.
- TypeORM: similar story; declare via `@Index` with `synchronize: false` plus migration files.
- Atlas / Bytebase: `lint` hooks that flag `DROP INDEX` against allowlisted index names.
- Hand-rolled SQL migrations only (no ORM-managed schema): no drift problem, more boilerplate everywhere else.

**Lesson:** when picking an ORM for a project that will use Postgres extensions, audit whether the ORM's schema DSL can express the features you'll need. If not, design the migration workflow around `--create-only` (or equivalent) from day one rather than catching the silent DROP later.

**Code:** [backend/prisma/schema.prisma:36-46](../backend/prisma/schema.prisma#L36-L46), [Makefile](../Makefile) `migrate` / `migrate-apply` / `setup` targets, [add_pg_trgm_gin_search migration](../backend/prisma/migrations/20260502153230_add_pg_trgm_gin_search/migration.sql)
**See also:** ADR-0010 (`pg_trgm` GIN for Chinese substring search), §3 above (CJK trigram threshold), AI_JOURNAL M4 entry.

<!-- Append new sections below, numbered, in roughly the order you learned
     them. Reorder later if a more logical grouping emerges. -->
