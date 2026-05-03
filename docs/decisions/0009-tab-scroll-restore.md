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
3. **List scroll position**. The page body is height-bounded (so the
   chrome — header, tabs, filter row — stays put and only the card
   list scrolls); `window.scrollY` is 0. The actual scroll lives on
   react-window's internal `<List>` element via its `scrollTop`. Browser
   doesn't have a primitive for "remember where I was scrolled before
   this navigation."

Three storage strategies considered:

- **All in URL**, including scroll position. Would mean
  `/?tab=ORG&subCategory=動物保護&scrollY=1234`. Ugly URLs,
  scrollY value leaks into shareable links and history, no way to
  cleanly "consume" it on restore.
- **All in sessionStorage**, including tab. Clean URLs but a hard
  refresh of `/` loses the active tab — the URL is now the wrong
  source of truth.
- **Hybrid: URL for navigable state, sessionStorage for ephemeral
  scroll offset.** Refreshing `/` keeps the tab/sub-cat (URL);
  refreshing `/search` intentionally loses the prior scroll (a fresh
  search session shouldn't snap to where you were before — and as of
  the RR-006 reconfirmation fix, refreshing `/search` actively *clears*
  any leftover key, so a later 取消 can't honour stale state from a
  prior session).

## Decision

**Hybrid: URL for tab + sub-category, sessionStorage for `scrollY`.**

Implementation lives in [`frontend/src/lib/restore.ts`](../../frontend/src/lib/restore.ts):

```ts
type RestoreState = {
  tab: string;
  // Field name preserved for sessionStorage compatibility; semantically
  // this is the List element's `scrollTop`, not window.scrollY (the
  // body is height-bounded — see Context).
  scrollY: number;
  subCategory?: string;  // restored alongside tab when present
};

saveRestoreState({ tab, scrollY, subCategory });
loadRestoreState(): RestoreState | null;     // non-destructive
clearRestoreState(): void;
consumeRestoreState(): RestoreState | null;  // atomic load + clear
```

`consumeRestoreState` was added in RR-006 review feedback — Codex caught that the original "consume only on the happy path" pattern leaked stale keys: if `HomeClient` mounted with `scrollY <= 0` or a tab mismatch the key persisted in sessionStorage and could be misread by a later cancel from a direct-visit `/search`. Atomic load+clear is the audit-friendly fix.

Single `sessionStorage` key (`jopay:home-restore`) for the whole record.
Tab + sub-category are stored both in the URL (so refresh works) AND in
sessionStorage (so the cancel flow has a single source for the restore).

Flow:

- **From `/` to `/search`** (search-icon button click in `HomeClient`):
  1. Read current `tab` / `subCategory` / List `element.scrollTop` (HomeClient holds the `<List>` imperative API in state via a `listRef` callback wired through `ItemList`).
  2. `saveRestoreState({ tab, scrollY, subCategory })` where `scrollY` is the List `scrollTop`.
  3. `router.push('/search?tab=<currentTab>')` — the search starts in the same category context the user was browsing. `?q=` is added later by the input's debounce effect.

- **On `/search` mount** (`SearchClient` `useEffect`):
  1. `consumeRestoreState()` — atomic load + clear, idempotency-guarded for Strict-Mode dev double-effect via a `consumedRef`. The snapshot lives in `restoreSnapshotRef` for the lifetime of the search session.
  2. **This is what closes the stale-restore hole.** Codex caught it in the RR-006 reconfirmation: if consume happened at cancel time instead, a refresh of `/search` (or a direct deep-link visit) would leave the key in sessionStorage and a later 取消 would honour it. Consuming at mount means: by the time the user can refresh, the key is already gone; the next mount finds storage empty.

- **From `/search` to `/` via `取消`** (cancel button in `SearchClient`):
  1. Read `restoreSnapshotRef.current`.
  2. If present, `saveRestoreState(snapshot)` to re-write the key for `HomeClient` to consume, then `router.push('/?tab=…&subCategory=…')`.
  3. If absent (refresh of `/search`, direct deep link, or no prior cancel-flow), `router.push('/')`.

- **On `/` mount** (`HomeClient` `useEffect`):
  1. `consumeRestoreState()` — atomic load + clear. The key is gone after this call regardless of whether the rest of the effect uses the value. **Single-use guarantee**: the key cannot survive a no-op mount path (early-return because `scrollY <= 0` or tab mismatch).
  2. If `scrollY > 0` and the active tab matches, stash the offset in a ref. A separate effect keyed on the List's imperative API applies it via `listApi.element.scrollTop = scrollY` inside `requestAnimationFrame` once the API attaches — react-window measures asynchronously, so the imperative API isn't available on the first effect tick.
  3. (No separate clear — step 1 already did it.)

- **On `/search` hard refresh**: SearchClient remounts; the consume-on-mount step finds storage empty (it was cleared by the *previous* mount's consume). 取消 falls through to plain `router.push('/')`. No stale honour.

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
