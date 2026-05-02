# ADR-0015 — FE↔BE type sharing: `openapi-typescript` codegen from the OpenAPI spec

**Date**: 2026-05-03
**Status**: Accepted

## Context

Backend route handlers are zod-typed end-to-end (ADR-0013). Frontend
needs the same shapes — request query types, response item shape,
nullable category-specific fields, error response — and they must not
drift when the BE schema changes. Three candidates:

- **A. Hand-redeclare in FE.** `frontend/src/lib/types.ts` mirrors `Item`,
  `ItemListResponse`, etc. Fastest to bootstrap, drifts the moment BE
  changes a field. Drift surfaces as runtime bugs (e.g. FE expects
  `amountGoal` after BE renames it; nothing fails to compile).
- **B. Shared package in a monorepo.** Move types into a `shared/` package
  consumed by both BE and FE. Real solution for production but pulls in
  workspace tooling (pnpm workspaces / nx / turborepo) we don't have, and
  the brief is local-dev-friendly flat repo.
- **C. Codegen from the OpenAPI spec.** `openapi-typescript` reads the
  BE's `/docs/json` and emits a `paths` interface with full operation
  signatures. Combined with `openapi-fetch`, every FE call site gets
  end-to-end typing without a shared package. The BE's zod schemas are
  the source of truth (ADR-0013); the OpenAPI spec is generated from
  them; FE types are generated from the spec. Three-step pipeline,
  zero hand-maintenance.

## Decision

**Option C: `openapi-typescript` v7 → `frontend/src/lib/api-types.ts`,
consumed via `openapi-fetch`.**

- Source of truth: BE zod schemas (in `backend/src/lib/schemas.ts` +
  per-route inline schemas).
- Pipeline: zod → `fastify-type-provider-zod` → `@fastify/swagger`'s
  `/docs/json` → `openapi-typescript` → `frontend/src/lib/api-types.ts`.
- Manual step: `make types` (Makefile target) regenerates
  `api-types.ts`. Requires the BE to be reachable on `:3001`.
- The generated file is committed (not regenerated at build time) so:
  1. CI doesn't need to boot Postgres + BE just to build FE.
  2. PR diffs show schema changes alongside FE consumer changes.
  3. Reviewer can read the types without bringing up the stack.

## Consequences

**Easier:**
- FE callsites are end-to-end typed: `api.GET('/items', { params: { query: { category: 'ORG' } } })` — the `paths` interface narrows category to `'ORG' | 'CAMPAIGN' | 'MERCHANDISE'`, response.data to `{ items: Item[]; nextCursor: string | null }`, etc. Drift between BE schema and FE consumer becomes a TypeScript error.
- No monorepo / workspace tooling. Each subdirectory is a normal `npm install` target.
- The same OpenAPI spec also drives Swagger UI at `/docs`, so the schema is **simultaneously** documentation, runtime validation (BE), and type generation (FE).

**Harder:**
- The codegen is a manual `make types` step — easy to forget. Mitigations:
  - Keep `api-types.ts` committed; PR diff makes "this change updates API types but not callsites" obvious during code review.
  - At M9 / pre-submission, add a CI check: `make types && git diff --exit-code -- frontend/src/lib/api-types.ts` fails if the committed types don't match a freshly-generated copy.
- Generated `paths` interface is verbose to navigate. Mitigated by re-exporting commonly-used types (`Item`, `ItemListResponse`, etc.) in `frontend/src/lib/api.ts` so callers import friendly names.
- Stale `api-types.ts` plus a stale `api.ts` re-export would compile but fail at runtime. Compounding stale-ness risk; the M9 CI check above catches the first generation gap.

## Revisit

If the project grows to a real monorepo (many shared services, a packaged design system, etc.), shared-package-based types may eat the codegen approach because they enable cross-service refactors with one rename. For the current FE+BE dual-tree shape, codegen wins.
