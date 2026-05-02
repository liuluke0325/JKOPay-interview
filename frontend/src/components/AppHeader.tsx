import { getTranslations } from 'next-intl/server';

// Server component — title comes from the i18n dictionary at request
// time. Mockup shows the title centered on a JKO-red bar with a back
// chevron on the left (the back chevron is a no-op on the root view per
// the mockup chrome — it's only meaningful on /search and /items/[id],
// which land in M5 / M6).
export async function AppHeader() {
  const t = await getTranslations('header');

  return (
    <header className="bg-(--color-jko) text-white shadow-sm">
      <div className="mx-auto flex max-w-3xl items-center px-4 py-4">
        {/* Back-chevron placeholder — non-interactive on /, kept for
            visual parity with the mockup. M6 makes it a real <Link>. */}
        <span aria-hidden className="w-5 text-lg leading-none">{'<'}</span>
        <h1 className="flex-1 text-center text-lg font-semibold">{t('title')}</h1>
        {/* Spacer to balance the back-chevron column on the left. */}
        <span aria-hidden className="w-5" />
      </div>
    </header>
  );
}
