# ADR-0008 — List virtualization with `react-window` v2

**Date**: 2026-05-03
**Status**: Accepted

## Context

REQUIREMENTS §5.A and Hard Rule 11 ("design for production load, not the
seed size") require the M4 card list to scale beyond the 90-item demo
seed. At 10k+ items, naïve `.map(item => <Card />)` renders the whole
list to DOM — kills mobile scrolling, blows up memory, and TBT/LCP
metrics tank. We need virtualization: only render the rows in the
viewport (plus a small overscan window).

Three candidates considered:

- **`react-window` v2** (Brian Vaughn, 2024 rewrite). Single `<List />`
  component with `rowComponent`/`rowCount`/`rowHeight` props.
  Built-in `ResizeObserver` measures the parent container; the list
  fills available height without manual measurement. Supports both
  fixed-px and dynamic row heights via `useDynamicRowHeight`.
  Bundle size: ~5KB gzipped.
- **`react-virtuoso`**. Rich feature set (header/footer slots,
  groupings, sticky items, item-state restoration). Variable-height
  rows are first-class without a separate hook. Bundle larger
  (~30KB+) and more abstractions.
- **Hand-rolled with `IntersectionObserver`**. Render all items but
  hide non-visible ones. Doesn't actually solve the DOM-size problem
  — DOM nodes still exist, just hidden. Worth dismissing explicitly.

## Decision

**`react-window` v2 with `<List />`, fixed row height** (`CARD_HEIGHT_PX
= 96`, defined in `frontend/src/components/Card.tsx`).

The card design (mockup-driven) is uniform: square logo (64px) + 1-line
title (truncated) + 2-line description (line-clamped). Locking row
height means we don't need `useDynamicRowHeight`; the simpler
`rowHeight: 96` path keeps render predictable and react-window's
internal scroll math perfect.

Infinite-scroll triggering uses react-window's `onRowsRendered`
callback: when `stopIndex` approaches `rowCount - PREFETCH_OFFSET` and
TanStack Query's `hasNextPage` is true, call `fetchNextPage`. No
separate `IntersectionObserver` sentinel needed.

## Consequences

**Easier:**
- DOM size stays bounded regardless of `rowCount`. 10k items render
  ~12 DOM rows (visible) + small overscan.
- Mobile scrolling stays at 60fps because the browser only paints what
  changes.
- Predictable layout — no jitter as variable-height rows expand
  during scroll.
- `onRowsRendered` is a single callback that solves the prefetch
  problem; no extra observer wiring.

**Harder:**
- Card design is locked to a single fixed height. If product later
  needs variable-height rows (e.g. "expand to read more"), we either
  switch to `useDynamicRowHeight` (still possible in v2) or adopt
  react-virtuoso. Documented as a known constraint.
- react-window v2 ships its own TypeScript types. The legacy
  `@types/react-window` package targets v1 and is wrong for v2 —
  we removed it after the install (RR-005 commit log).
- The list's parent must be a sized flex container. react-window
  measures its own parent via `ResizeObserver`; if the parent has
  `height: auto` the list collapses to `defaultHeight`. We use
  `flex-1` on the wrapper so the section fills remaining viewport.
- Card content can't lazily expand in-place; "show more"-style
  interactions would need to navigate to `/items/[id]` (which is M6)
  rather than mutate row height.

## Revisit

If the product ever needs:
- **Truly dynamic row heights** (variable description length without
  truncation, expandable detail in-line), and the dynamic-height
  story in react-window v2 feels brittle, **switch to
  `react-virtuoso`**. Same composition shape; different list component.
- **Group headers / sticky items** (e.g. group cards by month, sticky
  "today" header), `react-virtuoso` is the better fit and the swap is
  proportional to the number of `<List />` usages (currently one).
- **Server-side rendering of the visible page** for SEO. `react-window`
  doesn't render server-side. For card-list SEO we'd need either a
  static fallback route or a different rendering strategy. Out of
  scope for the brief (the list is a logged-in-style consumer surface,
  not a search-engine target).
