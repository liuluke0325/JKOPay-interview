'use client';

import Image from 'next/image';
import { useFormatter, useTranslations } from 'next-intl';
import { useItem } from '@/lib/queries';
import type { ItemDetail as ItemDetailData } from '@/lib/api';
import { LoadingIcon } from './LoadingIcon';

// Detail page body. Lives under <Suspense> in `app/items/[id]/page.tsx`;
// the suspense boundary handles the initial async params resolution
// rather than the data fetch (TanStack Query owns loading state).
//
// Layout (mobile-first):
//   - Logo + sub-category badge
//   - Title (bold)
//   - Description (multi-line)
//   - Category-specific block:
//       CAMPAIGN: progress bar (raised / goal) + deadline
//       MERCHANDISE: price + stock
//       ORG: nothing additional
//
// 404 is surfaced as a dedicated empty-state (not a generic fetch error)
// so deep-linking to a stale id gives a clear message instead of an
// infinite spinner. The retry policy in `useItem` skips 404s.
export function ItemDetail({ id }: { id: string }) {
  const t = useTranslations('detail');
  const tErrors = useTranslations('errors');
  const format = useFormatter();
  const { data, isPending, isError, error } = useItem(id);

  if (isPending) {
    return (
      <div
        role="status"
        aria-label={t('loading')}
        className="flex flex-1 items-center justify-center py-16"
      >
        <LoadingIcon />
      </div>
    );
  }

  if (isError) {
    const status = (error as Error & { status?: number }).status;
    const isNotFound = status === 404;
    return (
      <div
        role="alert"
        className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-sm text-zinc-500"
      >
        <p>{isNotFound ? t('notFound') : tErrors('fetchFailed')}</p>
      </div>
    );
  }

  return (
    <article className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6">
      <header className="flex items-start gap-4">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md bg-zinc-50">
          <Image
            src={data.logoUrl}
            alt=""
            fill
            sizes="96px"
            unoptimized
            className="object-contain"
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="self-start rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
            {data.subCategory}
          </span>
          <h2 className="text-lg font-semibold text-zinc-900">{data.title}</h2>
        </div>
      </header>

      <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-700">
        {data.description}
      </p>

      <CategoryBlock data={data} format={format} t={t} />
    </article>
  );
}

type FormatFn = ReturnType<typeof useFormatter>;
type Translator = ReturnType<typeof useTranslations<'detail'>>;

// Category-dispatch lives in its own component so the parent stays a
// single linear story (header → description → category block). Each
// branch reads only its own nullable fields; the discriminator is
// `data.category`.
function CategoryBlock({
  data,
  format,
  t,
}: {
  data: ItemDetailData;
  format: FormatFn;
  t: Translator;
}) {
  if (data.category === 'CAMPAIGN') {
    const raised = data.amountRaised ?? 0;
    const goal = data.amountGoal ?? 0;
    // Goal might be 0 in malformed data — clamp the bar to avoid
    // a NaN width. Display "—" for the percentage in that edge case.
    const pct = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;
    return (
      <section className="flex flex-col gap-2 rounded-md border border-zinc-200 bg-white p-4">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-medium text-zinc-900">
            {t('raised')} NT$ {format.number(raised)}
          </span>
          <span className="text-xs text-zinc-500">
            {t('goal')} NT$ {format.number(goal)}
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-2 w-full overflow-hidden rounded-full bg-zinc-100"
        >
          <div
            className="h-full bg-(--color-jko) transition-[width]"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-right text-xs text-zinc-500">{pct}%</span>
        {data.deadline && (
          <p className="text-xs text-zinc-500">
            {t('deadlineRow', {
              date: format.dateTime(new Date(data.deadline), { dateStyle: 'medium' }),
            })}
          </p>
        )}
      </section>
    );
  }

  if (data.category === 'MERCHANDISE') {
    return (
      <section className="flex items-baseline justify-between rounded-md border border-zinc-200 bg-white p-4 text-sm">
        <span className="font-semibold text-zinc-900">
          {t('price')} NT$ {format.number(data.price ?? 0)}
        </span>
        <span className="text-xs text-zinc-500">
          {t('stock')} {format.number(data.stock ?? 0)}
        </span>
      </section>
    );
  }

  // ORG — description above is the whole story; nothing more to render.
  return null;
}
