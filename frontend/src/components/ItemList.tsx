'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import { List, type ListImperativeAPI, type RowComponentProps } from 'react-window';
import { useInfiniteItems } from '@/lib/queries';
import type { Category, Item } from '@/lib/api';
import { Card, CARD_HEIGHT_PX } from './Card';
import { EndOfListSeparator } from './EndOfListSeparator';
import { EmptyState } from './EmptyState';
import { LoadingIcon } from './LoadingIcon';

// Number of rows from the end at which we prefetch the next page.
// Slightly bigger than one viewport so the user shouldn't see a loader
// at the bottom under normal scrolling speed.
const PREFETCH_OFFSET = 5;

type ListRowProps = { items: Item[]; showEndOfList: boolean };

// Row component contract from react-window v2: receives `index`, `style`,
// `ariaAttributes` from the List, plus whatever we pass via `rowProps`.
function ItemRow({
  index,
  style,
  items,
  showEndOfList,
  ariaAttributes,
}: RowComponentProps<ListRowProps>) {
  const item = items[index];
  if (!item && showEndOfList) {
    return (
      <div style={style} {...ariaAttributes}>
        <EndOfListSeparator />
      </div>
    );
  }
  return (
    <div style={style} {...ariaAttributes}>
      <Card item={item} />
    </div>
  );
}

export function ItemList({
  category,
  subCategory,
  q,
  listRef,
}: {
  category: Category;
  subCategory?: string;
  /** Search query for /search; undefined on /. */
  q?: string;
  /** Optional ref-callback so the parent can read/write the List's
   *  internal scrollTop (used by HomeClient for ADR-0009 restore). */
  listRef?: (api: ListImperativeAPI | null) => void;
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
    q: q || undefined,
    limit: 20,
  });

  // Flatten paged items for the virtualizer.
  const items = data?.pages.flatMap((page) => page.items) ?? [];
  const showEndOfList = !hasNextPage;
  const rowCount = items.length + (showEndOfList ? 1 : 0);

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
        <LoadingIcon />
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
    <div className="flex flex-1 flex-col min-h-0">
      {/* react-window measures its parent container via ResizeObserver
          (v2 behavior), so the wrapper must be a sized flex child for
          the list to fill the remaining viewport height. */}
      <div className="flex-1 min-h-0">
        <List
          rowComponent={ItemRow}
          rowCount={rowCount}
          rowHeight={CARD_HEIGHT_PX}
          rowProps={{ items, showEndOfList }}
          onRowsRendered={handleRowsRendered}
          overscanCount={4}
          defaultHeight={600}
          style={{ height: '100%' }}
          listRef={listRef}
        />
      </div>
    </div>
  );
}
