// TanStack Query hooks layered on top of the typed `api` client.
// One file per logical resource is the convention; for the small M3
// surface we keep them together.

'use client';

import { useQuery } from '@tanstack/react-query';
import { api, type Category } from './api';

const STALE_5M = 5 * 60 * 1000;
const STALE_1M = 60 * 1000;

/**
 * Sub-categories for the `全部 ▼` dropdown. The backend response is
 * deterministic per category (TS constants module on the BE), so cache
 * aggressively — both via Cache-Control on the wire and via a long
 * `staleTime` here so tab-switching doesn't refetch.
 */
export function useSubCategories(category: Category) {
  return useQuery({
    queryKey: ['sub-categories', category],
    queryFn: async () => {
      const { data, error } = await api.GET('/sub-categories', {
        params: { query: { category } },
      });
      if (error) throw new Error(`/sub-categories failed`);
      return data;
    },
    staleTime: STALE_5M,
  });
}

/**
 * Items list — used in M4 for infinite scroll. Single-page version here
 * for early wiring; M4 swaps to `useInfiniteQuery` to thread the cursor.
 */
export function useItems(args: {
  category: Category;
  subCategory?: string;
  q?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['items', args],
    queryFn: async () => {
      const { data, error } = await api.GET('/items', {
        params: { query: args },
      });
      if (error) throw new Error(`/items failed`);
      return data;
    },
    staleTime: STALE_1M,
  });
}
