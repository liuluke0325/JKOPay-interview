'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';

export function SearchInput({
  value,
  onChange,
  onCancel,
  autoFocus = true,
}: {
  value: string;
  onChange: (next: string) => void;
  onCancel: () => void;
  autoFocus?: boolean;
}) {
  const t = useTranslations('search');
  const inputRef = useRef<HTMLInputElement>(null);

  // autoFocus on JSX would trigger before hydration; doing it in an
  // effect is the App Router-safe path. Only fires when entering /search,
  // not on every re-render.
  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  return (
    <div className="flex max-w-3xl items-center gap-3 px-4 py-3">
      <div className="relative flex-1">
        <span
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </span>
        <input
          ref={inputRef}
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t('placeholder')}
          aria-label={t('placeholder')}
          className={[
            'w-full rounded-full bg-zinc-100 py-2 pl-9 pr-4 text-sm text-zinc-900',
            'placeholder:text-zinc-400',
            'focus:bg-white focus:outline-none focus:ring-2 focus:ring-(--color-jko)',
          ].join(' ')}
        />
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="text-sm font-medium text-(--color-jko) hover:opacity-80"
      >
        {t('cancel')}
      </button>
    </div>
  );
}
