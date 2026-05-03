# ADR-0009 — Tab + scroll restore on `/search` cancel

**Date**: 2026-05-03
**Status**: Accepted

## Context

REQUIREMENTS §5.B says: tapping `取消` on `/search` must return the user
to `/` with the **prior tab + scroll position restored**. The mockup
treats `/search` as a modal-ish dedicated screen — when you cancel, you
expect to land back on the exact card you were looking at.

Three pieces of state need to survive the round trip:

1. **Active tab** (`公益團體` / `捐款專案` / `義賣商品`). Already lives
   in the URL as `?tab=` on `/`.
2. **Active sub-category** filter. Lives in the URL as `?subCategory=`
   on `/`.
3. **`window.scrollY`**. Browser doesn't have a primitive for "remember
   where I was scrolled before this navigation."

Three storage strategies considered:

- **All in URL**, including scroll position. Would mean
  `/?tab=ORG&subCategory=動物保護&scrollY=1234`. Ugly URLs,
  scrollY value leaks into shareable links and history, no way to
  cleanly "consume" it on restore.
- **All in sessionStorage**, including tab. Clean URLs but a hard
  refresh of `/` loses the active tab — the URL is now the wrong
  source of truth.
- **Hybrid: URL for navigable state, sessionStorage for ephemeral
  scrollY.** Refreshing `/` keeps the tab/sub-cat (URL); refreshing
  `/search` intentionally loses the prior scroll (a fresh search
  session shouldn't snap to where you were before).

## Decision

**Hybrid: URL for tab + sub-category, sessionStorage for `scrollY`.**

Implementation lives in [`frontend/src/lib/restore.ts`](../../frontend/src/lib/restore.ts):

```ts
type RestoreState = {
  tab: string;
  scrollY: number;
  subCategory?: string;  // restored alongside tab when present
};

saveRestoreState({ tab, scrollY, subCategory });
loadRestoreState(): RestoreState | null;
clearRestoreState(): void;
```

Single `sessionStorage` key (`jopay:home-restore`) for the whole record.
Tab + sub-category are stored both in the URL (so refresh works) AND in
sessionStorage (so the cancel flow has a single source for the restore).

Flow:

- **From `/` to `/search`** (search-icon button click in `HomeClient`):
  1. Read current `tab` / `subCategory` / `window.scrollY`.
  2. `saveRestoreState({ tab, scrollY, subCategory })`.
  3. `router.push('/search')`.

- **From `/search` to `/` via `取消`** (cancel button in `SearchClient`):
  1. `loadRestoreState()`.
  2. If present, `router.push('/?tab=…&subCategory=…')`. Don't clear
     sessionStorage yet — `HomeClient` consumes scrollY first.
  3. If absent (deep link directly to `/search`), `router.push('/')`.

- **On `/` mount** (`HomeClient` `useEffect`):
  1. `loadRestoreState()`.
  2. If `scrollY > 0` and the active tab matches, `window.scrollTo(0, scrollY)` after one frame (so the list has time to render virtual rows).
  3. `clearRestoreState()` — single-use.

- **On `/search` hard refresh**: sessionStorage may still have the prior
  state, but the user explicitly chose to refresh — we treat the
  scrollY as stale and only honor it on the next cancel-flow trip.

## Consequences

**Easier:**
- Tab + sub-category survive a refresh on `/` (URL source of truth).
- Scroll position survives a SPA round trip but doesn't leak into URLs.
- Single sessionStorage key — easy to inspect in devtools, easy to
  clear during dev.
- Restore failure modes are graceful: missing key → land on `/?tab=ORG`
  default; corrupt JSON → ignore and use defaults; storage disabled
  (privacy mode) → restore is best-effort, app still works.

**Harder:**
- Two writes per nav (URL + sessionStorage) for tab/sub-cat. Not a perf
  concern at human-scroll speeds, but worth knowing if state grows.
- Restoring scrollY needs to wait until the virtualized list mounts
  enough rows to make the position meaningful. Naively calling
  `scrollTo` on first paint scrolls past the end of the rendered window
  → react-window snaps back. Mitigation: defer with
  `requestAnimationFrame` (or a small `setTimeout(0)`) so react-window
  has rendered the initial overscan window first.
- `useEffect` race: if the user navigates away from `/` before the
  restore effect fires, sessionStorage stays stale until next cancel.
  Cleared on the next consume — safe but mildly wasteful.

## Revisit

If the product introduces:

- **Cross-route persistent scroll restoration** (e.g. detail page
  back-nav also restores scroll), promote the `restore.ts` helpers to
  a richer "navigation state" abstraction with multiple keyed entries.
- **Multi-tab browser support** where each tab has its own restore
  point, sessionStorage is already per-tab so we're fine.
- **SSR-resumable scroll**, would need to ship the scrollY in an inline
  script (like Next.js does for hydration mismatch repair) — out of
  scope for the brief.
