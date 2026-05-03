'use client';

import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ListImperativeAPI } from 'react-window';
import { Tabs } from './Tabs';
import { SubCategoryDropdown } from './SubCategoryDropdown';
import { ItemList } from './ItemList';
import type { Category } from '@/lib/api';
import { useSubCategories } from '@/lib/queries';
import { consumeRestoreState, saveRestoreState } from '@/lib/restore';

// All client-only state lives here so the parent `app/page.tsx` stays
// a server component. URL `?tab=` and `?subCategory=` are the source
// of truth for both — initial render reads them; user actions push new
// URLs and React re-renders.
//
// Card list area (M4) is the virtualized <ItemList />. Search-icon
// button (M5) saves the current { tab, subCategory, scrollY } to
// sessionStorage and navigates to /search. Mount effect consumes
// sessionStorage to restore scroll position when arriving back from
// /search via cancel.

const VALID_CATEGORIES = new Set<Category>(['ORG', 'CAMPAIGN', 'MERCHANDISE']);

function parseCategory(raw: string | null): Category {
  if (raw && VALID_CATEGORIES.has(raw as Category)) return raw as Category;
  return 'ORG';
}

export function HomeClient() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeTab = useMemo(
    () => parseCategory(searchParams.get('tab')),
    [searchParams],
  );
  const activeSubCategory = searchParams.get('subCategory') ?? '';

  // Single helper to push URL changes; preserves other params and uses
  // `replace` so tab/sub-cat picks don't pile up in browser history.
  const pushParams = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === '') next.delete(key);
        else next.set(key, value);
      }
      const qs = next.toString();
      router.replace(qs ? `/?${qs}` : '/', { scroll: false });
    },
    [router, searchParams],
  );

  const handleTabChange = useCallback(
    (next: Category) => {
      // Switching tab clears the sub-category — sub-categories are
      // category-specific (different lists per tab) so a stale value
      // would either render an invalid filter or confuse the user.
      pushParams({ tab: next, subCategory: null });
    },
    [pushParams],
  );

  const handleSubCategoryChange = useCallback(
    (next: string) => {
      pushParams({ subCategory: next || null });
    },
    [pushParams],
  );

  // Defensive URL cleanup: a deep link like
  // `/?tab=CAMPAIGN&subCategory=動物保護` carries an ORG sub-cat into a
  // CAMPAIGN context — invalid for the active tab. Once the
  // sub-categories load for the current tab, drop any URL value that
  // isn't in the list. M4 will start sending this to /items, where the
  // BE returns 400 for invalid combos (Codex flagged this in RR-004).
  const { data: subCategoryOptions } = useSubCategories(activeTab);
  useEffect(() => {
    if (!activeSubCategory || !subCategoryOptions) return;
    const valid = subCategoryOptions.some((opt) => opt.value === activeSubCategory);
    if (!valid) {
      pushParams({ subCategory: null });
    }
  }, [activeSubCategory, subCategoryOptions, pushParams]);

  // The card list owns the actual scroll container (react-window's
  // <List> internal scroller — body is height-bounded so window.scrollY
  // is always 0). We hold the imperative API in state so we can both:
  //   - read `element.scrollTop` on search-icon click (save)
  //   - apply a saved scrollTop once the list mounts (restore)
  const [listApi, setListApi] = useState<ListImperativeAPI | null>(null);

  // Restore scroll position when arriving back from /search (ADR-0009).
  // Atomic consume on mount stashes the offset in a ref; the listApi
  // effect below applies it once the List has mounted (the ref is
  // populated async after react-window measures its parent).
  const pendingScrollTop = useRef<number | null>(null);
  useEffect(() => {
    const restore = consumeRestoreState();
    if (!restore || restore.scrollY <= 0) return;
    if (restore.tab !== activeTab) return; // tab mismatch — stale state
    pendingScrollTop.current = restore.scrollY;
    // Mount-only effect — the URL params are the source of truth for
    // tab/sub-cat. We only want to restore scroll on the entry from
    // /search, not on every URL change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Once the List's imperative API is attached, apply any pending
  // scroll. Defer with rAF so react-window has rendered its initial
  // overscan window — scrolling before that and the virtualizer snaps
  // back to top.
  useEffect(() => {
    if (!listApi) return;
    const target = pendingScrollTop.current;
    if (target === null) return;
    pendingScrollTop.current = null; // single-use
    requestAnimationFrame(() => {
      const el = listApi.element;
      if (el) el.scrollTop = target;
    });
  }, [listApi]);

  // Search-icon click: snapshot { tab, subCategory, scrollY } before
  // navigating to /search so cancel can restore. scrollY here is the
  // List element's scrollTop (not window.scrollY) — body is height-
  // bounded and the List internal-scrolls.
  const handleSearchClick = useCallback(() => {
    const scrollTop = listApi?.element?.scrollTop ?? 0;
    saveRestoreState({
      tab: activeTab,
      subCategory: activeSubCategory || undefined,
      scrollY: scrollTop,
    });
    // Preserve current tab in /search URL so the search starts in the
    // same category context the user was browsing.
    const params = new URLSearchParams();
    params.set('tab', activeTab);
    router.push(`/search?${params.toString()}`);
  }, [activeTab, activeSubCategory, listApi, router]);

  return (
    <>
      <Tabs active={activeTab} onChange={handleTabChange} />

      <div className="mx-auto flex w-full max-w-3xl items-center justify-between bg-[#f2f2f5] px-4 py-5">
        <SubCategoryDropdown
          category={activeTab}
          value={activeSubCategory}
          onChange={handleSubCategoryChange}
        />
        {/* Search-icon button — saves { tab, subCategory, scrollY } to
            sessionStorage and navigates to /search. SearchClient's 取消
            reads it back on the way home (ADR-0009). */}
        <button
          type="button"
          aria-label={t('search.placeholder')}
          onClick={handleSearchClick}
          className="rounded-full bg-[#e9e9ef] p-4 text-zinc-500 hover:bg-[#e2e2e8]"
        >
          {/* Inline SVG magnifier — no icon dep. */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-7 w-7"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </button>
      </div>

      {/* Card list area — virtualized via react-window (ADR-0008).
          ItemList owns its own loading/empty/error states + infinite-
          scroll pagination via TanStack useInfiniteQuery (ADR-0014). */}
      <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col min-h-0 bg-[#f2f2f5]">
        <ItemList
          category={activeTab}
          subCategory={activeSubCategory || undefined}
          listRef={setListApi}
        />
      </section>
    </>
  );
}
