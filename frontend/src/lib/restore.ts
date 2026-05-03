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
  /** window.scrollY at the time of navigation. */
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
