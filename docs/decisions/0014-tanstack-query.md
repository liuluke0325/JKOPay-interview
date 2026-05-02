# ADR-0014 — Frontend data fetching: TanStack Query (with `openapi-fetch`)

**Date**: 2026-05-03
**Status**: Accepted

## Context

The frontend has three data-fetching surfaces, each with different
requirements:

1. **`/sub-categories`** — small response, used in dropdowns. Cached
   aggressively at HTTP layer (s-maxage=3600 per ADR-0012); the FE just
   needs to fetch once per category per session.
2. **`/items` list** (M4) — the infinite-scroll engine. Needs cursor
   continuation, dedup across pages, abort on filter/search change,
   pending/error states per page.
3. **`/items/:id`** detail (M6) — fetched per click, cached so back-nav
   from detail returns instantly.

The four candidates considered:

- **Plain `fetch` + `useState/useEffect`.** Zero deps. We hand-roll
  cursor accumulation, abort controllers, loading/error states, dedup.
  Each surface re-implements the same plumbing. Predictably ends in
  bugs around stale closures, race conditions on rapid filter changes,
  and forgetting to abort.
- **SWR (Vercel).** Smaller surface than TanStack Query. Has
  `useSWRInfinite` for cursor pagination. Solid but slightly less
  ergonomic for the search-debounce + abort + cancel cycle in M5.
- **TanStack Query** (formerly React Query). Larger feature set:
  `useInfiniteQuery` natively threads cursors; query keys give
  declarative cache invalidation; query cancellation is built into
  `queryFn`'s `AbortSignal`; devtools are first-class.
- **RTK Query** (Redux Toolkit). Strong for projects already on Redux.
  We have no Redux; pulling it in for this is overkill.

## Decision

**`@tanstack/react-query` v5 + `openapi-fetch` for the typed transport
layer.**

- `frontend/src/lib/api.ts` exports a single `api` client typed against
  the codegen'd `paths` interface (see ADR-0015).
- `frontend/src/lib/queries.ts` exports per-resource `useX` hooks. These
  call `api.GET(...)` and return TanStack Query results.
- `frontend/src/app/providers.tsx` is the `'use client'` wrapper that
  owns the `QueryClient` and renders `ReactQueryDevtools` in dev only.
- Default options:
  - `refetchOnWindowFocus: false` — dev iteration churns less.
  - `retry: false` — surface errors instead of silently retrying;
    flip to a retry policy before submission if needed.

## Consequences

**Easier:**
- M4's infinite scroll becomes `useInfiniteQuery({ getNextPageParam: (last) => last.nextCursor })` — the cursor pagination from M2's BE is the canonical input.
- M5's search abort: `queryFn: ({ signal }) => api.GET('/items', { signal, params: ... })`. Rapid typing cancels in-flight requests automatically.
- Tab/scroll restore (ADR-0009) gets a free assist: switching tabs hits a different `queryKey`, the previous tab's data stays cached, returning is instant.
- Devtools panel shows live query cache during development — useful when wiring search/cursor edge cases.

**Harder:**
- One more dep + ~30KB gzipped runtime. Acceptable for the demo.
- Mental model overhead vs plain fetch: query keys, stale time, GC time, refetch behaviors. Documented in `queries.ts` so consumers don't have to learn the full library to use a hook.
- Server components can't use TanStack hooks (they're `'use client'`). Page-level components stay server by default; data-fetching is pushed into `<HomeClient />` leaf components per the App Router pattern.

## Revisit

If the FE shrinks to one or two simple read endpoints, plain fetch becomes proportionally more attractive — TanStack Query is overhead the project would no longer earn back. With three data surfaces (list/detail/sub-categories) plus M4-M5 pagination + abort needs, the current decision pays off.
