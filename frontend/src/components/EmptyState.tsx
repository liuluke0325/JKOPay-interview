'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';

// Empty-state illustration matching the mockup's "查無相關資料" screen
// (folder icon with a speech-bubble overlay). Inline SVG so we don't
// add an icon library or asset file. Reused at M5 for the search empty
// state (where the title/hint copy fits the search context exactly);
// M4 uses it for the rare "no items in this category" case (won't
// happen with our seed but the surface needs the right shape).
//
// Title/hint default to the search-empty copy since the mockup's
// illustration is the search variant; callers can override per context.
export function EmptyState({
  title,
  hint,
}: {
  title?: string;
  hint?: string;
} = {}) {
  const t = useTranslations('search');
  const titleText = title ?? t('emptyTitle');
  const hintText = hint ?? t('emptyHint');

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <Image
        src="/empty-state-folder.png"
        alt=""
        aria-hidden
        width={128}
        height={128}
        unoptimized
      />
      <div className="space-y-1">
        <p className="text-base font-semibold text-zinc-700">{titleText}</p>
        <p className="text-sm text-zinc-400">{hintText}</p>
      </div>
    </div>
  );
}
