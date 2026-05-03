'use client';

import { useTranslations } from 'next-intl';
import { useSubCategories } from '@/lib/queries';
import type { Category } from '@/lib/api';

// Native <select> styled with Tailwind. Matches the mockup's `全部 ▼`
// affordance and gets accessibility (keyboard nav, screen reader, mobile
// system picker) for free. If the design later demands a custom popover
// menu we'll swap in a Radix-based one — but for v1 native is correct.
//
// `value === ''` represents "全部" (no sub-category filter).
export function SubCategoryDropdown({
  category,
  value,
  onChange,
}: {
  category: Category;
  value: string;
  onChange: (next: string) => void;
}) {
  const t = useTranslations('filter');
  const { data, isPending, isError } = useSubCategories(category);

  return (
    <div className="relative inline-block">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={isPending || isError}
        aria-label={t('allLabel')}
        className={[
          'appearance-none rounded-xl border-0 bg-[#e9e9ef] py-3 pl-5 pr-11 text-lg font-semibold',
          'text-zinc-700 focus:outline-none focus:ring-2 focus:ring-(--color-jko)',
          'disabled:opacity-50',
        ].join(' ')}
      >
        <option value="">{t('allLabel')}</option>
        {data?.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {/* Custom caret — Tailwind chevron rendered via CSS so we don't
          ship a separate icon dep. */}
      <span
        aria-hidden
        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-zinc-400"
      >
        ▼
      </span>
    </div>
  );
}
