'use client';

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
      <FolderWithBubbleIcon />
      <div className="space-y-1">
        <p className="text-base font-semibold text-zinc-700">{titleText}</p>
        <p className="text-sm text-zinc-400">{hintText}</p>
      </div>
    </div>
  );
}

function FolderWithBubbleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 96 96"
      width="96"
      height="96"
      aria-hidden
      className="text-zinc-300"
    >
      {/* Folder body */}
      <path
        fill="currentColor"
        d="M14 36 L14 72 C14 76 17 79 21 79 L75 79 C79 79 82 76 82 72 L82 42 C82 38 79 35 75 35 L46 35 L42 30 C40 28 38 27 35 27 L21 27 C17 27 14 30 14 33 Z"
      />
      {/* Speech bubble */}
      <circle cx="64" cy="32" r="14" fill="#ffffff" stroke="currentColor" strokeWidth="2" />
      <path d="M58 42 L52 50 L62 44 Z" fill="#ffffff" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      {/* Three dots inside bubble */}
      <circle cx="58" cy="32" r="2" fill="currentColor" />
      <circle cx="64" cy="32" r="2" fill="currentColor" />
      <circle cx="70" cy="32" r="2" fill="currentColor" />
    </svg>
  );
}
