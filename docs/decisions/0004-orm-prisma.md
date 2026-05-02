# ADR-0004 — ORM: Prisma over TypeORM

**Date**: 2026-05-02
**Status**: Accepted

## Context

The brief lists "typeORM, prisma" as bonus #2. Either earns the bonus point;
the choice is about which we want to live with for the next 8 milestones.

The relevant differences for this project:

- **Schema authoring.** Prisma uses a separate `schema.prisma` DSL with a
  generated typed client. TypeORM uses TS classes with decorators that
  double as both schema definition and runtime model.
- **Migrations.** Prisma owns migrations natively (`prisma migrate dev`
  generates SQL, applies, and shadow-tests). TypeORM has migrations but the
  story has historically been bumpier — auto-generation drift, harder
  shadow-DB story.
- **Type ergonomics.** Prisma's generated client gives narrow types per
  query (`select` / `include` shape the return type at the call site).
  TypeORM's repositories return the full entity by default; narrowing
  requires manual DTOs.
- **Hard Rule 3** (ORM-only DB access). Both qualify; what matters is which
  makes "no raw SQL" pleasant. Prisma's query builder is closer to
  declarative — easier to stay inside the rule. TypeORM has `QueryBuilder`
  which is powerful but slides toward string-y SQL fast.

## Decision

**Prisma 6.x.** `schema.prisma` is the source of truth, migrations live in
`prisma/migrations/`, the generated client in `node_modules/@prisma/client`
gives us call-site-narrowed types in route handlers.

## Consequences

**Easier:**
- Migrations: `prisma migrate dev --name <slug>` is one command and
  produces a committed `migration.sql`. Schema drift is visible in PRs.
- Types per query: `findMany({ where, take, orderBy })` returns the
  `Item` shape with the right nullability — handlers compile against
  exact response shape with no DTO layer.
- Seed integration: `prisma db seed` with `package.json#prisma.seed`
  hook (deprecated in v7, but works in v6).

**Harder:**
- Adds a code-generation step (`prisma generate`) that has to run after
  schema changes and before the next typecheck. CI must run it explicitly.
- Schema is defined outside TypeScript — Prisma's DSL has its own syntax,
  reviewers unfamiliar with it have to learn it.
- Some Postgres features (GIN indexes with `gin_trgm_ops`) aren't
  expressible in the schema DSL and need raw-SQL migrations alongside
  (see ADR-0010).

## Revisit

If we ever need a feature Prisma can't express cleanly (we're already at
one — the GIN index — but it's manageable), or if the v7 migration to
`prisma.config.ts` breaks our existing `package.json#prisma.seed` setup
in a painful way. The v7 migration is tracked as a Prisma 6 deprecation
warning we agreed to defer to M9.
