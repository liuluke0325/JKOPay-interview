'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { SearchInput } from './SearchInput';
import { Tabs } from './Tabs';
import { ItemList } from './ItemList';
import { useDebouncedValue } from '@/lib/hooks';
import { clearRestoreState, loadRestoreState } from '@/lib/restore';
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

  // Push debounced value into the URL so refreshing /search?q=foo works
  // and the back button has the right query state. Use replace so each
  // keystroke doesn't pile up history entries. Effect (not render) so
  // we don't re-render → re-replace → re-render in a loop.
  useEffect(() => {
    const current = searchParams.get('q') ?? '';
    if (debouncedQ === current) return;
    const next = new URLSearchParams(searchParams.toString());
    if (debouncedQ) next.set('q', debouncedQ);
    else next.delete('q');
    router.replace(`/search?${next.toString()}`, { scroll: false });
  }, [debouncedQ, router, searchParams]);

  const handleTabChange = useCallback(
    (next: Category) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', next);
      router.replace(`/search?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  // Cancel restores the prior `/` state per ADR-0009. Tab + sub-category
  // come from URL params on `/`; scrollY comes from sessionStorage.
  // The restore happens on the destination side: HomeClient reads
  // sessionStorage on mount and scrolls to scrollY, then clears.
  const handleCancel = useCallback(() => {
    const restore = loadRestoreState();
    if (restore) {
      const params = new URLSearchParams();
      params.set('tab', restore.tab);
      if (restore.subCategory) params.set('subCategory', restore.subCategory);
      // Don't clear sessionStorage here — HomeClient consumes scrollY
      // first and clears after restoring.
      router.push(`/?${params.toString()}`);
    } else {
      // No prior state (deep link directly to /search) — go to default.
      clearRestoreState();
      router.push('/');
    }
  }, [router]);

  return (
    <>
      <SearchInput value={inputValue} onChange={setInputValue} onCancel={handleCancel} />
      <Tabs active={activeTab} onChange={handleTabChange} />
      <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
        <ItemList category={activeTab} q={debouncedQ || undefined} />
      </section>
    </>
  );
}
