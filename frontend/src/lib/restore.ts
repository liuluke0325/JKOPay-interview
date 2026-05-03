// Tab + scroll restore for the / ↔ /search round trip (ADR-0009).
//
// Strategy: the tab lives in the URL on / (?tab=...), so a refresh-then-
// back round-trips correctly without sessionStorage. scrollY can't go in
// the URL — use sessionStorage so the value survives a SPA navigation
// to /search and back, but is cleared on a hard refresh of /search
// (intentional: a refresh is a fresh search session, no prior scroll
// to restore).

const STORAGE_KEY = 'jopay:home-restore';

export type RestoreState = {
  /** Active category tab on `/` at the time of navigation. */
  tab: string;
  /** Scroll offset of the card list at the time of navigation. The
   *  page body is height-bounded (so window.scrollY is always 0); the
   *  card list owns the actual scroll container via react-window's
   *  internal `<List>` scroller. This is its `element.scrollTop`. The
   *  field name `scrollY` is kept for sessionStorage compatibility. */
  scrollY: number;
  /** Sub-category filter active on `/`, if any. Restored alongside tab. */
  subCategory?: string;
};

export function saveRestoreState(state: RestoreState): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota / privacy mode / disabled storage — restore is best-effort.
  }
}

export function loadRestoreState(): RestoreState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RestoreState>;
    if (typeof parsed.tab !== 'string' || typeof parsed.scrollY !== 'number') {
      return null;
    }
    return {
      tab: parsed.tab,
      scrollY: parsed.scrollY,
      subCategory: typeof parsed.subCategory === 'string' ? parsed.subCategory : undefined,
    };
  } catch {
    return null;
  }
}

export function clearRestoreState(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // No-op — see saveRestoreState comment.
  }
}

/**
 * Atomic load + clear. Use this from any consumer (HomeClient mount,
 * SearchClient cancel) so restore state is **truly single-use** and
 * can never survive a no-op path. Without this, the original code had
 * a leak: if HomeClient mounted with the restore but the early-return
 * conditions hit (scrollY <= 0 or tab mismatch), the key persisted in
 * sessionStorage and could be misread by a later cancel from a
 * direct-visit `/search`. (Codex caught this in RR-006.)
 *
 * The contract: read = consume. If you load it, you've used it; the
 * key is gone. Never returns the same record twice.
 */
export function consumeRestoreState(): RestoreState | null {
  const state = loadRestoreState();
  clearRestoreState();
  return state;
}
