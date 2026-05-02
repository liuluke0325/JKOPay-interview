'use client';

import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import { Tabs } from './Tabs';
import { SubCategoryDropdown } from './SubCategoryDropdown';
import type { Category } from '@/lib/api';

// All client-only state lives here so the parent `app/page.tsx` stays
// a server component. URL `?tab=` and `?subCategory=` are the source
// of truth for both — initial render reads them; user actions push new
// URLs and React re-renders.
//
// M4 fills the empty card-list area below this with the virtualized
// list. M5 wires the magnifier-icon button to navigate to /search.

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

  return (
    <>
      <Tabs active={activeTab} onChange={handleTabChange} />

      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <SubCategoryDropdown
          category={activeTab}
          value={activeSubCategory}
          onChange={handleSubCategoryChange}
        />
        {/* Search-icon button — wired in M5 to navigate to /search,
            preserving current tab + scroll for restore-on-cancel. */}
        <button
          type="button"
          aria-label={t('search.placeholder')}
          disabled
          className="rounded-md p-2 text-zinc-500 hover:bg-zinc-100 disabled:opacity-50"
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
            className="h-5 w-5"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </button>
      </div>

      {/* Card list area — M4 replaces this placeholder with the
          virtualized list. */}
      <section className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 text-zinc-500">
        <p className="text-sm">
          M3 shell ready. Active tab: <strong>{activeTab}</strong>
          {activeSubCategory && (
            <>
              {' · '}sub-category: <strong>{activeSubCategory}</strong>
            </>
          )}
          . Card list lands in M4.
        </p>
      </section>
    </>
  );
}
