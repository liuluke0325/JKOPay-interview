import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';

// Server component — title comes from the i18n dictionary at request
// time. Mockup shows the title centered on a JKO-red bar with a back
// chevron on the left. The chevron is a no-op visual placeholder on
// `/` and `/search`; on `/items/[id]` the detail page swaps in a real
// <BackButton/> via the `leadingSlot` prop.
export async function AppHeader({
  leadingSlot,
  title,
}: {
  leadingSlot?: ReactNode;
  title?: string;
} = {}) {
  const t = await getTranslations('header');
  const headerTitle = title ?? t('title');

  return (
    <header className="bg-(--color-jko) text-white shadow-sm">
      <div className="mx-auto flex max-w-3xl items-center px-4 py-4">
        <span className="flex w-5 items-center text-lg leading-none">
          {leadingSlot ?? (
            <span aria-hidden>{'<'}</span>
          )}
        </span>
        <h1 className="flex-1 text-center text-lg font-semibold">{headerTitle}</h1>
        {/* Spacer to balance the leading column on the left. */}
        <span aria-hidden className="w-5" />
      </div>
    </header>
  );
}
