// TanStack Query hooks layered on top of the typed `api` client.
// One file per logical resource is the convention; for the small M3
// surface we keep them together.

'use client';

import { useQuery } from '@tanstack/react-query';
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
 * Items list — used in M4 for infinite scroll. Single-page version here
 * for early wiring; M4 swaps to `useInfiniteQuery` to thread the cursor.
 * Both versions thread the AbortSignal so rapid filter/search changes
 * cancel in-flight requests (ADR-0014).
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
