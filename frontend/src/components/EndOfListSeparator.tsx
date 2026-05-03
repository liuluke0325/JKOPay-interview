'use client';

import { useTranslations } from 'next-intl';

// Renders the `— 愛心沒有底線 —` separator from the mockup. Shown when
// the last page of an infinite-scroll list has loaded (TanStack
// `hasNextPage === false`).
export function EndOfListSeparator() {
  const t = useTranslations('list');
  return (
    <div className="flex items-center justify-center gap-3 py-6 text-xs text-zinc-400">
      <span aria-hidden className="h-px w-12 bg-zinc-200" />
      <span>{t('endOfList')}</span>
      <span aria-hidden className="h-px w-12 bg-zinc-200" />
    </div>
  );
}
