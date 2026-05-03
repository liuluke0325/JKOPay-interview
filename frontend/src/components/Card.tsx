'use client';

import Image from 'next/image';
import type { Item } from '@/lib/api';

// Fixed-height card matching the mockup: square logo on the left,
// 1-line title (truncated) + 2-line description (line-clamped) on the
// right. Height is locked to CARD_HEIGHT_PX so react-window's FixedSize
// row component (ADR-0008) can virtualize without measuring.
//
// Click handler is a no-op for M4 — M6 wires it to navigate to
// `/items/[id]`. Logging via data-attribute so e2e (M7) can assert.
export const CARD_HEIGHT_PX = 96;

export function Card({ item }: { item: Item }) {
  return (
    <article
      data-item-id={item.id}
      className="flex h-full items-center gap-3 border-b border-zinc-100 px-4 py-3"
    >
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-zinc-50">
        <Image
          src={item.logoUrl}
          alt=""
          fill
          sizes="64px"
          // SVGs in /public/logos/ — Next.js Image optimizer doesn't help
          // with vector files; skip optimization to avoid build complexity.
          unoptimized
          className="object-contain"
        />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold text-zinc-900">{item.title}</h3>
        <p className="line-clamp-2 text-xs text-zinc-500">{item.description}</p>
      </div>
    </article>
  );
}
