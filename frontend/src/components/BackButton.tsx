'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

// `<` chevron in the header on `/items/[id]`. `router.back()` returns
// the user to whatever was previously on the history stack — usually
// `/` or `/search`, whichever they navigated from. Browser-back works
// the same way natively; this button just makes the on-screen chevron
// behave the same as the browser control.
//
// Scoped scroll-restoration on detail-back is intentionally out of M6
// scope (Codex RR-006 carry-over: SearchClient's consume-on-mount
// pattern doesn't generalize). Default Next.js back-nav puts the user
// at the top of the previous page, which matches the brief — the
// scroll-position requirement in REQUIREMENTS §C is deferred.
export function BackButton() {
  const router = useRouter();
  const t = useTranslations('detail');
  return (
    <button
      type="button"
      onClick={() => router.back()}
      aria-label={t('back')}
      className="text-lg leading-none transition-opacity hover:opacity-80"
    >
      {'<'}
    </button>
  );
}
