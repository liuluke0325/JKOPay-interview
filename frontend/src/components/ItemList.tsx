'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import { List, type RowComponentProps } from 'react-window';
import { useInfiniteItems } from '@/lib/queries';
import type { Category, Item } from '@/lib/api';
import { Card, CARD_HEIGHT_PX } from './Card';
import { EndOfListSeparator } from './EndOfListSeparator';
import { EmptyState } from './EmptyState';

// Number of rows from the end at which we prefetch the next page.
// Slightly bigger than one viewport so the user shouldn't see a loader
// at the bottom under normal scrolling speed.
const PREFETCH_OFFSET = 5;

type ListRowProps = { items: Item[] };

// Row component contract from react-window v2: receives `index`, `style`,
// `ariaAttributes` from the List, plus whatever we pass via `rowProps`.
function ItemRow({ index, style, items, ariaAttributes }: RowComponentProps<ListRowProps>) {
  const item = items[index];
  if (!item) return null;
  return (
    <div style={style} {...ariaAttributes}>
      <Card item={item} />
    </div>
  );
}

export function ItemList({
  category,
  subCategory,
}: {
  category: Category;
  subCategory?: string;
}) {
  const tList = useTranslations('list');
  const tErrors = useTranslations('errors');
  const {
    data,
    isPending,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteItems({
    category,
    subCategory: subCategory || undefined,
    limit: 20,
  });

  // Flatten paged items for the virtualizer.
  const items = data?.pages.flatMap((page) => page.items) ?? [];

  // react-window v2 onRowsRendered: prefetch when we're within
  // PREFETCH_OFFSET rows of the end and there are more pages to load.
  const handleRowsRendered = useCallback(
    ({ stopIndex }: { startIndex: number; stopIndex: number }) => {
      if (
        hasNextPage &&
        !isFetchingNextPage &&
        stopIndex >= items.length - PREFETCH_OFFSET
      ) {
        void fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage, items.length],
  );

  if (isPending) {
    return (
      <div
        role="status"
        aria-label={tList('loading')}
        className="flex flex-1 items-center justify-center py-16"
      >
        <Spinner />
      </div>
    );
  }

  if (isError) {
    return (
      <div role="alert" className="flex flex-1 items-center justify-center py-16 text-sm text-zinc-500">
        {tErrors('fetchFailed')}
      </div>
    );
  }

  if (items.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* react-window measures its parent container via ResizeObserver
          (v2 behavior), so the wrapper must be a sized flex child for
          the list to fill the remaining viewport height. */}
      <div className="flex-1 min-h-0">
        <List
          rowComponent={ItemRow}
          rowCount={items.length}
          rowHeight={CARD_HEIGHT_PX}
          rowProps={{ items }}
          onRowsRendered={handleRowsRendered}
          overscanCount={4}
          defaultHeight={600}
          style={{ height: '100%' }}
        />
      </div>
      {!hasNextPage && <EndOfListSeparator />}
    </div>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-(--color-jko)"
    />
  );
}
