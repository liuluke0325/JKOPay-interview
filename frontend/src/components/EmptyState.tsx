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
      viewBox="0 0 128 128"
      width="128"
      height="128"
      aria-hidden
    >
      <defs>
        <linearGradient id="empty-folder-back" x1="18" x2="104" y1="48" y2="96" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F1F2F7" />
          <stop offset="1" stopColor="#DADDE6" />
        </linearGradient>
        <linearGradient id="empty-folder-front" x1="18" x2="112" y1="62" y2="111" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F7F8FB" />
          <stop offset="1" stopColor="#D9DCE5" />
        </linearGradient>
        <filter id="empty-folder-shadow" x="8" y="18" width="112" height="100" colorInterpolationFilters="sRGB">
          <feDropShadow dx="0" dy="3" stdDeviation="2" floodColor="#B8BDCA" floodOpacity=".45" />
        </filter>
      </defs>

      <path
        filter="url(#empty-folder-shadow)"
        fill="url(#empty-folder-back)"
        stroke="#B9BECA"
        strokeWidth="1.5"
        d="M14 49c0-4 3-7 7-7h22c3 0 5 1 7 4l4 6h53c4 0 7 3 7 7v41c0 5-4 9-9 9H23c-5 0-9-4-9-9V49Z"
      />
      <path
        fill="url(#empty-folder-front)"
        stroke="#C2C6D1"
        strokeWidth="1.5"
        d="M11 106 25 58c1-4 4-6 8-6h78c5 0 8 5 7 9l-12 43c-1 4-5 7-9 7H15c-3 0-5-2-4-5Z"
      />
      <path
        fill="#EFF1F7"
        stroke="#C7CBD6"
        strokeWidth="1.5"
        d="M28 52h84c4 0 7 4 6 8l-1 4H23l1-5c1-4 3-7 4-7Z"
      />

      <ellipse cx="88" cy="31" rx="24" ry="18" fill="#D9DCE5" stroke="#9EA4B2" strokeWidth="1.5" />
      <path
        d="M75 45 67 54l13-5"
        fill="#D9DCE5"
        stroke="#9EA4B2"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="78" cy="31" r="2.5" fill="#FFFFFF" />
      <circle cx="88" cy="31" r="2.5" fill="#FFFFFF" />
      <circle cx="98" cy="31" r="2.5" fill="#FFFFFF" />
    </svg>
  );
}
