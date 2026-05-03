// TanStack Query hooks layered on top of the typed `api` client.
// One file per logical resource is the convention; for the small M3
// surface we keep them together.

'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { api, type Category } from './api';

// staleTime values are aligned with the BE's Cache-Control max-age
// (ADR-0012). Keeping the two layers in sync means a refetch after the
// stale window has the best chance of serving from the CDN edge cache
// rather than hitting origin.
const STALE_SUB_CATEGORIES_MS = 5 * 60 * 1000; // BE: max-age=300, s-maxage=3600
const STALE_ITEMS_MS = 30 * 1000; // BE: max-age=30, s-maxage=60

/**
 * Sub-categories for the `全部 ▼` dropdown. The backend response is
 * deterministic per category (TS constants module on the BE), so cache
 * aggressively — both via Cache-Control on the wire and via a long
 * `staleTime` here so tab-switching doesn't refetch.
 */
export function useSubCategories(category: Category) {
  return useQuery({
    queryKey: ['sub-categories', category],
    queryFn: async ({ signal }) => {
      const { data, error } = await api.GET('/sub-categories', {
        params: { query: { category } },
        signal,
      });
      if (error) throw new Error(`/sub-categories failed`);
      return data;
    },
    staleTime: STALE_SUB_CATEGORIES_MS,
  });
}

/**
 * Items list — single-page version. Kept for cases (e.g. detail prefetch)
 * where the caller doesn't need pagination. The infinite-scroll variant
 * lives in `useInfiniteItems` below.
 */
export function useItems(args: {
  category: Category;
  subCategory?: string;
  q?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['items', args],
    queryFn: async ({ signal }) => {
      const { data, error } = await api.GET('/items', {
        params: { query: args },
        signal,
      });
      if (error) throw new Error(`/items failed`);
      return data;
    },
    staleTime: STALE_ITEMS_MS,
  });
}

/**
 * Items list with cursor pagination. Drives M4's infinite-scroll.
 * `getNextPageParam` reads `nextCursor` from the most recent page; when
 * the BE returns `null`, TanStack Query knows there are no more pages
 * and `hasNextPage` flips to false.
 *
 * Each fetch threads TanStack's AbortSignal so rapid tab/sub-cat
 * changes cancel in-flight pages — combined with the fact that
 * `queryKey` includes the filter args, swapping filters starts a fresh
 * cache entry rather than poisoning the previous one.
 */
/**
 * Single item by id — drives the `/items/[id]` detail page. Cached
 * under the `['item', id]` key so navigating between detail pages
 * keeps the previously-viewed one warm. `staleTime` matches the BE's
 * `Cache-Control` on the same route (max-age=60).
 */
export function useItem(id: string) {
  return useQuery({
    queryKey: ['item', id],
    queryFn: async ({ signal }) => {
      const { data, error, response } = await api.GET('/items/{id}', {
        params: { path: { id } },
        signal,
      });
      if (error) {
        // Bubble 404 separately so the detail page can render the
        // "not found" empty state without retrying. Other errors
        // surface as the generic fetch-failed state.
        const err: Error & { status?: number } = new Error('/items/:id failed');
        err.status = response.status;
        throw err;
      }
      return data;
    },
    staleTime: STALE_ITEMS_MS,
    retry: (failureCount, error) => {
      const status = (error as Error & { status?: number }).status;
      if (status === 404) return false;
      return failureCount < 3;
    },
  });
}

export function useInfiniteItems(args: {
  category: Category;
  subCategory?: string;
  q?: string;
  limit?: number;
}) {
  return useInfiniteQuery({
    queryKey: ['items-infinite', args],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam, signal }) => {
      const { data, error } = await api.GET('/items', {
        params: { query: { ...args, cursor: pageParam } },
        signal,
      });
      if (error) throw new Error(`/items failed`);
      return data;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: STALE_ITEMS_MS,
  });
}
