'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { Item } from '@/lib/api';

// Fixed-height card matching the mockup: square logo on the left,
// 1-line title (truncated) + 2-line description (line-clamped) on the
// right. Height is locked to CARD_HEIGHT_PX so react-window's FixedSize
// row component (ADR-0008) can virtualize without measuring.
//
// M6: wraps the article in a <Link href={`/items/${id}`}> so the whole
// row routes to the detail page. Scroll restoration on detail-back is
// out of M6 scope (Codex RR-006 carry-over) — Next.js's default returns
// the user to the top of the previous page, which is acceptable per the
// brief's simplified scope.
//
// The data-item-id attr lets M7 e2e tests find a specific card without
// parsing innerText.
export const CARD_HEIGHT_PX = 96;

export function Card({ item }: { item: Item }) {
  return (
    <Link
      href={`/items/${item.id}`}
      data-item-id={item.id}
      className="mx-4 my-2 flex h-[calc(100%-1rem)] items-center gap-4 rounded-2xl bg-white px-5 py-3 transition-colors hover:bg-white/90 focus:bg-white/90 focus:outline-none"
    >
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white">
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
        <h3 className="truncate text-sm font-semibold text-zinc-950">{item.title}</h3>
        <p className="line-clamp-2 text-xs text-zinc-600">{item.description}</p>
      </div>
    </Link>
  );
}
