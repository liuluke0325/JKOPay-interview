# ADR-0006 — Cursor-based pagination over offset

**Date**: 2026-05-02
**Status**: Accepted

## Context

The list page is an infinite-scroll surface with concurrent search and filter
controls (REQUIREMENTS §5.A, §5.B). Two real properties of the data and UI
shape the choice:

1. **The seed inserts ~30 items per category in a tight burst.** Many rows
   share `createdAt` to the millisecond, so any pagination scheme keyed on
   `createdAt` alone will admit duplicates or skipped rows when items tie.
2. **The user cannot meaningfully "jump to page N".** The UI is scroll-based
   with optional search/filter; pages exist only as the consequence of how
   far the user has scrolled.

Offset pagination (`OFFSET N LIMIT K`) was the alternative considered. Two
problems killed it:

- **Drift under concurrent writes.** If a row is inserted at the top while
  the user is on page 2, page 3 will start one row after where page 2
  ended; the user sees a duplicate. If a row is deleted, page 3 skips one
  item. For an interactive list this is jank.
- **Linear cost.** `OFFSET 1000` makes Postgres scan and discard 1000 rows.
  At demo scale this doesn't matter; at any real scale it does, and the
  shape is wrong for an infinite-scroll product regardless of dataset size.

## Decision

Cursor-based pagination over a **compound key `(createdAt, id)`** with the
following machinery:

- **Order:** `ORDER BY createdAt DESC, id DESC`. Newest-first; `id` (cuid,
  lexicographically sortable) breaks `createdAt` ties.
- **Cursor encoding:** opaque base64url of `JSON.stringify({c: ISO, i: id})`.
  Implementation in [`backend/src/lib/cursor.ts`](../../backend/src/lib/cursor.ts).
- **Cursor application:** Prisma `where` clause with a non-overlapping
  exhaustive OR pair:
  ```
  OR: [
    { createdAt: { lt: c.createdAt } },
    { createdAt: c.createdAt, id: { lt: c.id } },
  ]
  ```
  This translates to the standard "items strictly after this point in the
  total order `(createdAt DESC, id DESC)`" tuple comparison and is
  provably non-overlapping (the two clauses partition the space `createdAt
  < c.createdAt` ⊎ `createdAt = c.createdAt ∧ id < c.id`).
- **Has-next detection:** `take: limit + 1`. If the result has `limit + 1`
  rows, drop the last one and emit its `(createdAt, id)` as `nextCursor`;
  otherwise `nextCursor = null`.
- **Index support:** the existing compound index
  `(category, subCategory, createdAt DESC)` covers the common
  filtered-list path. `id` doesn't need to be in the index — for any
  given `category[+subCategory]`, the planner descends `createdAt DESC`
  and only consults `id` for the small set of ties.

The **cursor is intentionally opaque to clients but transparent on inspection**
(base64url of plain JSON). This is a deliberate tradeoff for debuggability
during the build; if leaking timestamp information ever became a privacy
issue we'd encrypt or HMAC-sign the payload — neither is needed here.

## Consequences

**Easier:**
- Stable infinite scroll under concurrent writes — no jumping or dropped
  rows even if items are inserted/deleted during a session.
- Constant-time per page; no `OFFSET` skip cost.
- Pages compose with arbitrary `where` clauses (search, sub-category
  filter) without changing the cursor mechanics.

**Harder:**
- Can't address page N directly. We don't need to; the UI is scroll-based.
- Cursor is opaque, so clients can't infer "how far in" they are. Mitigated
  by our spec: we never expose item counts or page indices to the
  frontend.
- The handler must `take: limit + 1` and slice — slightly more work than a
  raw `LIMIT N`. Hidden in the route; tested via [`cursor.test.ts`](../../backend/src/lib/cursor.test.ts).
- Index choice is one-shot. If we ever change the order (e.g. by donation
  amount) we'd need a new compound index, a new cursor format, and a
  migration. Acceptable for the brief.

## Revisit

If the product later introduces a "jump to today" / "jump to date" affordance,
or any sort order other than `createdAt DESC`, this ADR needs a follow-up:
the cursor is tightly coupled to the order key.
