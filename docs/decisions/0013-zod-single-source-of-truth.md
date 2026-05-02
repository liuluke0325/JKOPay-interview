# ADR-0013 — zod + `fastify-type-provider-zod` as single source of truth (validation + OpenAPI)

**Date**: 2026-05-03
**Status**: Accepted

## Context

By M2 we needed three things from request schemas:

1. **Runtime validation** — reject malformed `category`, `cursor`, etc. with
   400.
2. **TypeScript types** in handlers — `request.query.category` should be
   `Category` enum, not `unknown` or `string`.
3. **OpenAPI documentation** — Swagger UI at `/docs` must accurately
   describe what each endpoint accepts.

If these come from three different sources of truth, they drift. Drift
between (1) and (2) is a footgun (handler narrows wrong); drift between
(1) and (3) is graded-artifact-fail (Swagger lies about behavior).

Considered approaches:

- **Fastify built-in JSON Schema** (zero deps). Single source for (1) +
  (3) — Fastify validates against schema and emits it to Swagger. But
  TypeScript types come from somewhere else (manual interfaces, or a
  JSON-schema-to-TS step). Drift surface between (2) and (1)/(3).
- **`@fastify/type-provider-typebox`** (TypeBox). TypeBox is JSON Schema +
  TypeScript types. Single source for (1) + (2) + (3). API: schemas look
  like `Type.Object({ category: Type.Enum(Category) })`. New mental model
  to learn but principled.
- **Manual `zod.safeParse` in each handler** (what we shipped initially
  in RR-002). Zod gives (1) + (2) at the handler level. (3) is still
  manual or absent — Swagger doesn't get the schema unless we duplicate.
  Drift surface between (1) and (3).
- **`fastify-type-provider-zod`** (the chosen path). Wires zod into
  Fastify's validator + serializer pipeline AND into `@fastify/swagger`'s
  `jsonSchemaTransform`. Same zod schema is (1) the validator at the
  Fastify boundary, (2) the source of `request.query`'s type via
  `withTypeProvider<ZodTypeProvider>()`, and (3) the OpenAPI body
  via the swagger transform.

## Decision

**`fastify-type-provider-zod` 6.x + `@fastify/swagger` + zod 4.x**, with
the type provider wired in `backend/src/app.ts` once and consumed by all
routes via `app.withTypeProvider<ZodTypeProvider>()`.

Schema files:
- [`backend/src/lib/schemas.ts`](../../backend/src/lib/schemas.ts) — shared
  response shapes (`ItemSchema`, `ItemListResponseSchema`,
  `SubCategoryResponseSchema`, `ErrorResponseSchema`).
- Per-route inline `Query` / `Params` schemas (e.g. in
  [`backend/src/routes/items.ts`](../../backend/src/routes/items.ts)).

Each route declares:

```ts
r.get('/items', {
  schema: {
    tags: ['items'],
    summary: '...',
    description: '...',
    querystring: ListQuery,        // ← zod schema
    response: {
      200: ItemListResponseSchema, // ← zod schema
      400: ErrorResponseSchema,    // ← zod schema
    },
  },
}, async (request, reply) => {
  const { category, ... } = request.query;  // ← typed from ListQuery via type provider
  ...
});
```

## Consequences

**Easier:**
- **Zero drift across the three concerns.** Change `ListQuery` once →
  validation, handler type, and OpenAPI all update.
- **One mental model** for reading routes. Reviewer sees the schema, sees
  the handler, knows the response shape.
- **Manual `safeParse` is gone.** Validation runs at the Fastify boundary
  before the handler is invoked; bad requests get a Fastify-shaped 400
  with the offending path/issue.
- **Swagger UI is automatically accurate** — it's generated from the same
  schemas the runtime enforces, so it can't lie about what the API
  accepts/returns.

**Harder:**
- **Two error shapes.** Schema-level validation failures come back
  Fastify-shaped (`{"error":"Bad Request","message":"querystring/category Invalid option..."}`).
  Semantic failures from handler bodies (invalid `subCategory` for a given
  `category`, malformed cursor) keep custom shapes
  (`{"error":"invalid_sub_category", ...}`) because they need information
  not expressible in static zod (cross-field validation, parse-not-shape
  questions). Documented in route descriptions and to be re-mentioned in
  the README API section at M9.
- **Date wire format gotcha.** Prisma returns `Date` instances; the OpenAPI
  schema declares ISO strings via `z.iso.datetime()`. The serializer
  compiler validates response output against the schema and would reject
  `Date`. Handlers explicitly call `.toISOString()` on `createdAt`/`deadline`
  before returning. Considered alternatives: `z.date()` (accept whatever
  JSON.stringify does — but breaks OpenAPI accuracy), or zod `.transform()`
  in the schema (works but adds another moving part).
- **One more dep** (`fastify-type-provider-zod`). Tracks Fastify v5 + zod 4.x.

## Revisit

If `fastify-type-provider-zod` falls behind on Fastify or zod major
versions, fall back to TypeBox via `@fastify/type-provider-typebox`. Same
shape; different schema DSL. Migration cost is roughly proportional to the
schema count (low — ~5 schemas total).

If we add a 5th+ endpoint with significantly different shape (websockets,
file upload), revisit whether the type provider's request inference still
helps.
