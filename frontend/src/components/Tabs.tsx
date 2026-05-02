'use client';

import { useTranslations } from 'next-intl';
import type { Category } from '@/lib/api';

const TAB_ORDER: readonly Category[] = ['ORG', 'CAMPAIGN', 'MERCHANDISE'];

export function Tabs({
  active,
  onChange,
}: {
  active: Category;
  onChange: (next: Category) => void;
}) {
  const t = useTranslations('tabs');
  const labelKey: Record<Category, 'org' | 'campaign' | 'merchandise'> = {
    ORG: 'org',
    CAMPAIGN: 'campaign',
    MERCHANDISE: 'merchandise',
  };

  return (
    <div role="tablist" className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-3xl">
        {TAB_ORDER.map((category) => {
          const isActive = category === active;
          return (
            <button
              key={category}
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange(category)}
              className={[
                'relative flex-1 px-4 py-3 text-sm font-medium transition-colors',
                isActive ? 'text-zinc-900' : 'text-zinc-500 hover:text-zinc-700',
              ].join(' ')}
            >
              {t(labelKey[category])}
              {isActive && (
                <span
                  aria-hidden
                  className="absolute inset-x-4 -bottom-px h-0.5 rounded bg-(--color-jko)"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
