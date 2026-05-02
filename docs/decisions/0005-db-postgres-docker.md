# ADR-0005 — Database: Postgres via docker-compose locally, Neon for managed

**Date**: 2026-05-02
**Status**: Accepted

## Context

The brief allows "Database" generally, no specific engine. The ORM bonus
(Prisma per ADR-0004) supports SQLite, MySQL, Postgres, MongoDB. Three
constraints shape the choice:

1. **Search.** Frontend has case-insensitive search (REQUIREMENTS §5.B).
   Different engines handle `ILIKE '%q%'` very differently:
   - SQLite: case-insensitive needs `COLLATE NOCASE` and only ASCII-aware
     by default; no GIN/trigram extension.
   - MySQL: collation-driven case-insensitive search; full-text search via
     `MATCH ... AGAINST` but Chinese tokenization is rough out-of-the-box.
   - Postgres: `ILIKE` is built-in and works with any UTF-8 collation;
     `pg_trgm` extension makes substring search index-backed (ADR-0010).
2. **Local dev ergonomics.** Reviewer should `make setup` and have it
   work. SQLite is zero-install but pushes the engine difference between
   local and prod. Postgres in docker-compose is one container away.
3. **Production deploy target.** Railway hosts the BE; Neon offers
   serverless Postgres on a generous free tier with `connection_limit`
   tunable. SQLite to Postgres in production is a forced migration; same
   engine end-to-end avoids that.

## Decision

**Postgres 16-alpine via docker-compose for local dev** (host port `5433` to
dodge a common 5432 collision; see RISKS R-original; ADR-0001's index entry).
**Neon for the deployed demo's managed Postgres**, configured in Railway via
`DATABASE_URL` with `connection_limit=N`.

Single `schema.prisma` is the source of truth across both environments;
migrations run via `prisma migrate dev` locally and `prisma migrate deploy`
in CI/Railway.

## Consequences

**Easier:**
- Same engine local and prod — no surprises in `ILIKE` semantics, no
  `pg_trgm` extension differences, identical query plans.
- Postgres-specific features (GIN/trigram, FTS, partial indexes) are
  available without "if production then..." branches.
- Neon free tier handles thousands of items with cold-start latency only
  on idle resume; enough for the demo.

**Harder:**
- Reviewer needs Docker installed locally (which is now standard but
  worth flagging). Documented in README via `make setup`.
- Connection-pool sizing matters more than for SQLite — Prisma defaults
  to ~10, which is conservative for a multi-replica deploy. `.env.example`
  documents `connection_limit` and `docs/SCALING.md` covers PgBouncer.
- The named volume in `docker-compose.yml` survives container restarts
  but persists across `make reset`; data must be intentionally `make clean`d
  to nuke it.

## Revisit

If the project grows beyond demo scale and we need read replicas, a
managed-Postgres provider with read-replica support (Neon, Crunchy, Aiven)
is the path. Architecture doesn't change; just the `DATABASE_URL`. Documented
in `docs/SCALING.md`.
