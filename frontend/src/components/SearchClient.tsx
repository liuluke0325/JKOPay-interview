'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SearchInput } from './SearchInput';
import { Tabs } from './Tabs';
import { ItemList } from './ItemList';
import { useDebouncedValue } from '@/lib/hooks';
import { consumeRestoreState, saveRestoreState, type RestoreState } from '@/lib/restore';
import type { Category } from '@/lib/api';

const VALID_CATEGORIES = new Set<Category>(['ORG', 'CAMPAIGN', 'MERCHANDISE']);

function parseCategory(raw: string | null): Category {
  if (raw && VALID_CATEGORIES.has(raw as Category)) return raw as Category;
  return 'ORG';
}

export function SearchClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL is the source of truth — `?q=` is shareable, `?tab=` keeps the
  // active category through reloads. Local input state mirrors `?q=`
  // so typing feels immediate; the debounced value flows into the URL
  // (and downstream into the query) after 300ms of quiet.
  const initialQ = searchParams.get('q') ?? '';
  const [inputValue, setInputValue] = useState(initialQ);
  const debouncedQ = useDebouncedValue(inputValue, 300);

  const activeTab: Category = parseCategory(searchParams.get('tab'));

  // Render-time state adjustment: if the URL `?q=` changes underneath
  // us (browser back/forward, or direct nav with a new q), mirror the
  // new value into local input state. `prevUrlQ` is the "what we last
  // saw" mirror — comparing against it (not against `inputValue`) lets
  // typing flow inputValue→debouncedQ→URL without echoing back into
  // setInputValue and cancelling the user's keystroke.
  //
  // This pattern (set during render, guarded by a previous-value
  // mirror) is documented in the React docs as "Adjusting state while
  // rendering" and intentionally avoids `react-hooks/set-state-in-effect`
  // — Codex flagged the prior `useEffect`-based mirror in RR-006.
  const urlQ = searchParams.get('q') ?? '';
  const [prevUrlQ, setPrevUrlQ] = useState(initialQ);
  if (urlQ !== prevUrlQ) {
    setPrevUrlQ(urlQ);
    setInputValue(urlQ);
  }

  // Push debounced value into the URL so refreshing /search?q=foo works
  // and the back button has the right query state. Read the *live* URL
  // via `window.location` (not the `searchParams` snapshot) and keep
  // `searchParams` out of the deps. Without that, browser back-nav
  // would: (a) update searchParams, (b) re-fire this effect with a
  // stale `debouncedQ` that still matches the pre-back value, and
  // (c) push the user back to where they came from — defeating the
  // back button. Now the effect only fires when `debouncedQ` itself
  // changes, after which `debouncedQ` and the URL agree.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const current = params.get('q') ?? '';
    if (debouncedQ === current) return;
    if (debouncedQ) params.set('q', debouncedQ);
    else params.delete('q');
    router.replace(`/search?${params.toString()}`, { scroll: false });
  }, [debouncedQ, router]);

  const handleTabChange = useCallback(
    (next: Category) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', next);
      router.replace(`/search?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  // Restore-state lifecycle (ADR-0009, second iteration after Codex's
  // RR-006 reconfirmation):
  //
  // - HomeClient saves { tab, subCategory, scrollY } before navigating
  //   to /search.
  // - SearchClient consumes that key on its OWN mount (atomic load+
  //   clear). The snapshot lives in a ref through the search session.
  // - On 取消: re-save the snapshot so the HomeClient remount can
  //   consume it, then navigate.
  //
  // Why consume on /search mount (not just at cancel time)? A refresh
  // of /search, or a direct deep-link visit, must NOT honour an old
  // sessionStorage key from a prior session — that was the round-2
  // blocker Codex caught. Consuming at mount means: by the time the
  // user can refresh, the key is gone; on the refreshed mount,
  // consumeRestoreState returns null; cancel falls through to plain `/`.
  //
  // Idempotency guard: in React Strict Mode dev, mount effects run
  // twice. We only want to call consumeRestoreState once (it has the
  // side effect of clearing storage). The `consumedRef` flag holds the
  // line — second run skips and the snapshot ref keeps the value from
  // the first run.
  const restoreSnapshotRef = useRef<RestoreState | null>(null);
  const consumedRef = useRef(false);
  useEffect(() => {
    if (consumedRef.current) return;
    consumedRef.current = true;
    restoreSnapshotRef.current = consumeRestoreState();
  }, []);

  const handleCancel = useCallback(() => {
    const restore = restoreSnapshotRef.current;
    if (restore) {
      // Re-save so HomeClient's mount effect consumes it on /. The
      // single-use contract (atomic consume on read) keeps the cycle
      // clean — HomeClient consumes, applies scroll, no leftover key.
      saveRestoreState(restore);
      const params = new URLSearchParams();
      params.set('tab', restore.tab);
      if (restore.subCategory) params.set('subCategory', restore.subCategory);
      router.push(`/?${params.toString()}`);
    } else {
      router.push('/');
    }
  }, [router]);

  return (
    <>
      <SearchInput value={inputValue} onChange={setInputValue} onCancel={handleCancel} />
      <Tabs active={activeTab} onChange={handleTabChange} />
      <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col min-h-0">
        <ItemList category={activeTab} q={debouncedQ || undefined} />
      </section>
    </>
  );
}
