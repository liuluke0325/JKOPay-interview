# Scaling & performance notes

The 90-item seed is a development convenience. This doc captures how the
backend is sized for **the realistic production scenario**: thousands of
concurrent callers, 10k–100k+ items, mobile clients on TPE-grade networks.

It's split into two parts: **what's implemented** (cheap, real) and **what's
deferred with rationale** (expensive or out of demo scope but documented so
the design doesn't pretend the problem doesn't exist).

---

## Implemented in M2 hardening pass

### 1. Substring search uses a `pg_trgm` GIN index, not btree

**Problem.** `ILIKE '%q%'` (leading-`%` substring search) cannot use plain
btree indexes — Postgres always seq-scans. At 10k+ items + 100 RPS the
search endpoint saturates DB CPU.

**Fix.** Migration `20260502153230_add_pg_trgm_gin_search`:
- `CREATE EXTENSION IF NOT EXISTS pg_trgm;`
- `CREATE INDEX … ON "Item" USING GIN (title gin_trgm_ops);`
- Same for `description`.
- Drops the now-useless btree indexes that the original schema had.

The planner picks the GIN scan once table size makes it cheaper than seq
scan (typically a few thousand rows, depending on `work_mem` and selectivity).
At demo size (90 rows) Postgres correctly stays on seq scan; the GIN index
is dormant but ready.

**Verify on a real-sized DB:**
```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT id FROM "Item"
WHERE category = 'ORG'
  AND (title ILIKE '%流浪%' OR description ILIKE '%流浪%');
```
At 10k+ rows the plan should show `Bitmap Index Scan on Item_title_trgm_idx`
or `Item_description_trgm_idx`.

### 2. Compression — `@fastify/compress` (gzip + brotli)

**Problem.** JSON payloads with Chinese text are unusually large because
UTF-8 encodes most CJK codepoints as 3 bytes each. A 30-item list response
runs ~25 KB raw. Mobile clients on cell networks pay that bandwidth.

**Fix.** `@fastify/compress` registered globally with `threshold: 1024` (don't
waste CPU compressing tiny responses like `/health`). Negotiates `br` first,
then `gzip`. Typical reduction: 3–5×.

### 3. HTTP caching — `Cache-Control` headers per route

| Endpoint | Cache strategy | Why |
|---|---|---|
| `/sub-categories` | `public, max-age=300, s-maxage=3600` | Derived from a static TS constant; doesn't change between deploys. CDN holds it for an hour. |
| `/items` (list) | `public, max-age=30, s-maxage=60` | Same query from many clients in the same minute can be served from edge. Short TTL accepts mild staleness for a >10× hit-rate win. |
| `/items/:id` (detail) | `public, max-age=60, s-maxage=300` | Detail records are stable per id; longer TTL is safe. |
| `/health` | (no cache) | Probes need to be live. |
| `/docs`, `/docs/json` | (no cache) | Reviewer-facing; wants fresh. |

CDN/edge cache fronting (Cloudflare, Vercel Edge) becomes effective
immediately because we set `s-maxage`. Without it the BE is the bottom of
every fetch.

### 4. Rate limiting — `@fastify/rate-limit` (with proxy trust deliberately conservative)

**Problem.** A single misbehaving (or hostile) client can saturate the BE
or DB.

**Fix.** `@fastify/rate-limit` registered globally: 100 req/min/IP by default
(`RATE_LIMIT_MAX` and `RATE_LIMIT_WINDOW` env-tunable). `/health` and
`/docs` are excluded from the limit (operators and reviewers shouldn't trip
it). Returns 429 with standard `Retry-After` and `x-ratelimit-*` headers.

**Spoof-resistance / `trustProxy`.** Earlier draft set `trustProxy: true`,
which lets any direct client send `X-Forwarded-For: <random>` and bypass
the per-IP limit (Codex flagged this in RR-003). Now `TRUST_PROXY`
**defaults to `false`** — `req.ip` reflects the socket peer, which a
direct client cannot fake.

For deployments behind a load balancer (Railway, Vercel Edge, Cloudflare,
…) the deployer must set `TRUST_PROXY` explicitly:

| Topology | `TRUST_PROXY` setting | Why |
|---|---|---|
| Local dev (no proxy) | unset / `false` | Socket peer IS the client. |
| Behind exactly one LB hop (Railway, Vercel) | `1` | Trust one proxy; client IP is the second-from-right entry in `X-Forwarded-For`. |
| Cloudflare → Railway (two hops) | `2` | One for CF edge, one for Railway. |
| Known LB CIDR | `10.0.0.0/8,127.0.0.1/32` | Comma-separated list. |
| Internal service mesh, can't enumerate | `true` (only if no path lets a client bypass the LB) | **Last resort**, equivalent to old behavior. |

The wrong setting in production silently turns rate limiting into theater,
so this is a deployment-time decision the operator must make explicitly,
not a default we can pick.

**Distributed state.** Per-instance, in-memory. With multiple BE replicas a
single client distributed across them effectively gets `replicas * limit`.
Real production swap: back with Redis (`@fastify/rate-limit` supports it
natively) — flagged in the deferred section.

### 5. Connection pool sizing — env-driven

**Problem.** Prisma's default pool is `num_physical_cpus * 2 + 1` which on
a small Railway/Render instance is ~5 connections. A burst of 1000 requests
queues waiting for a connection, p99 spikes to seconds.

**Fix.** `DATABASE_URL` accepts `?connection_limit=N`. Local dev defaults to
10; `.env.example` documents tuning. Production (Railway/Neon) sets via
the dashboard.

**Caveat.** Prisma's pool lives per-process. With multiple BE replicas the
total connections to Postgres = `replicas * connection_limit`. Neon's free
tier caps at ~100; with 4 replicas at 20 each you saturate. For real scale
put **PgBouncer in transaction-pooling mode** in front of Postgres and
point Prisma at the bouncer.

### 6. Request correlation — `x-request-id`

Fastify generates a request id automatically; the app reads incoming
`X-Request-Id` if it matches `^[A-Za-z0-9_.\-:]{1,128}$` (preserve from
upstream proxy) and otherwise mints a fresh UUID. Every response carries
`x-request-id`, so a user-reported failure can be traced to one log line.

`req.ip` reflects the real client only when `TRUST_PROXY` is configured
to match the deployment topology — see the rate-limiting section above
for the full deployment matrix. The default (`TRUST_PROXY` unset → `false`)
means `req.ip` is the socket peer, which is the right answer for local
dev and for any setup where there is no trusted upstream proxy.

---

## Deferred with rationale

These are real production needs that we *would* implement at scale but did
not implement here. Surfacing them so the deliverable doesn't pretend the
problems don't exist.

### Distributed rate-limit state

Current rate-limit is in-process. With `N` replicas, a determined client
can sustain `N × limit` rps. Production fix:

```ts
import Redis from 'ioredis';
await app.register(rateLimit, {
  redis: new Redis(process.env.REDIS_URL),
  // ... same limits ...
});
```

Why deferred: requires Redis provisioning. Neon doesn't offer Redis;
Railway has Redis as a separate add-on. Not worth the moving parts for the
demo.

### Hot-read caching tier (Redis)

`/sub-categories` is a strong candidate for in-process LRU OR Redis:
deterministic output, very small payload, called on every page load. The
CDN already handles this via `Cache-Control` headers, so a Redis layer is
duplicate effort *unless* we have a high cache-bypass rate. We don't.

If we did add Redis: cache `/sub-categories?category=X` and detail by id
(`/items/:id`) with a 5-minute TTL and key invalidation on item write.
Same CDN cost calculus, faster origin if the CDN misses.

### Read-replica routing

At write rates we don't have, splitting `/items*` reads to a replica would
free the primary for writes. Postgres + Prisma support this via
`directUrl` / `replicaUrl`. Not needed for read-mostly demo workloads.

### ETag (`@fastify/etag`) — not installed, here's why

Considered and skipped. Cache-Control with `s-maxage` already prevents
upstream caches from re-asking origin during the TTL window — the most
expensive case. ETag's value comes from cheap conditional-GET 304s on
*uncached* requests, which for our access pattern (server-set
`Cache-Control` with CDN fronting) is a marginal win. It also costs a
body-hash compute on every uncached response.

If the FE's cache strategy ends up doing aggressive `If-None-Match`
revalidation (e.g. SWR with `revalidate: true` on every focus), revisit:
add `@fastify/etag` and benchmark. One-line change, no schema impact.

### Repeatable `pg_trgm` verification

The migration creates the indexes; we ship a one-shot `EXPLAIN` example in
this doc, but the project doesn't yet have a script that bulk-inserts 10k
rows and runs `EXPLAIN (ANALYZE)` to demonstrate the planner choosing the
GIN index. That belongs alongside the load-test sketch below and lands
with M7 testing infrastructure. Suggested shape:

```sh
# scripts/verify-trgm.sh (M7)
docker exec jopay-postgres psql -U jopay -d jopay <<'SQL'
INSERT INTO "Item" (...) SELECT ... FROM generate_series(1, 10000);
ANALYZE "Item";
EXPLAIN (ANALYZE, BUFFERS) SELECT id FROM "Item"
  WHERE category='ORG'
    AND (title ILIKE '%流浪%' OR description ILIKE '%流浪%');
SQL
```

### Postgres FTS as alternative to `pg_trgm`

`pg_trgm` GIN handles substring search (matches user expectations: typing
`流浪` finds `流浪動物`). FTS (`tsvector` + `to_tsquery`) handles **word**
search and is more compact + faster, but requires word boundaries that
don't apply to Chinese without a tokenizer (e.g. `pg_jieba`). For Chinese
substring search, `pg_trgm` is the right answer; for English-heavy mixed
content, FTS would be a nice-to-have alternative.

### Observability

Currently: structured Pino logs to stdout, request id correlated. For
production you'd want:
- Logs shipped to Datadog/Loki/Cloudwatch with structured fields
- Metrics: p50/p95/p99 per route, DB pool wait time, rate-limit hits
- Distributed tracing via OpenTelemetry (Fastify has plugin support)
- Health probes used by the load balancer (we have `/health`; in prod also add `/ready` that distinguishes "process up" from "deps reachable")

### Load-test sketch

A `scripts/loadtest.sh` (autocannon or k6) would prove the hardening:

```sh
# Cold-cache
autocannon -c 100 -d 30 \
  'http://localhost:3001/items?category=ORG&limit=20'

# After cache warm-up
autocannon -c 100 -d 30 \
  'http://localhost:3001/sub-categories?category=ORG'
```

Targets to tune toward (single instance, small Postgres):
- p99 < 50ms for cached reads (`/sub-categories`)
- p99 < 200ms for paginated reads (`/items` first page)
- p99 < 400ms for search (`/items?q=…`) at 10k items with the GIN index
- 0 connection-pool wait events under sustained 200 RPS

Not implemented in this milestone — scope-limited — but the plumbing
(rate-limit, compression, indexes, request id) is in place to make the
test results meaningful.

### Frontend pairing

Backend caching is half the story; the frontend (M3+) needs to:
- Honor `Cache-Control` (browsers do this for free)
- Use stale-while-revalidate for the list endpoint (TanStack Query / SWR pattern)
- Virtualize the rendered list (`react-window`, planned in M4) so 10k items don't blow up DOM
- Debounce + abort search (planned in M5) so users typing fast don't flood the API

These are tracked in REQUIREMENTS §5.A–E and don't belong in this doc.

---

## What changed in M2 hardening (file-level summary)

- `backend/prisma/migrations/20260502153230_add_pg_trgm_gin_search/migration.sql` — extension + GIN indexes
- `backend/prisma/schema.prisma` — drop btree title/description indexes; comment pointing at the raw-SQL migration
- `backend/src/app.ts` — register `@fastify/compress`, `@fastify/rate-limit`; **`TRUST_PROXY` env-driven proxy trust** (default `false` for spoof-resistance); request id hook with regex-validated reflection
- `backend/src/routes/items.ts`, `backend/src/routes/sub-categories.ts` — `Cache-Control` headers
- `backend/package.json` — added `@fastify/compress`, `@fastify/rate-limit`
- `.env.example`, `backend/.env` — `DATABASE_URL` `connection_limit`, optional `RATE_LIMIT_MAX`/`RATE_LIMIT_WINDOW`
- `docs/RISKS.md` — R3 reframed; R13/R14/R15 added
- `AGENTS.md` Hard Rule #11 — design for production load
