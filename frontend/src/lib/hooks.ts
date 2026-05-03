'use client';

import { useEffect, useState } from 'react';

/**
 * Returns `value` after it has stayed unchanged for `delayMs`. Used by
 * the search input to avoid firing a query for every keystroke.
 *
 * Implementation note: the timer is cleared on every value change, so
 * rapid typing only fires one query at the end of the burst. Combined
 * with TanStack Query's AbortSignal threading, an in-flight request
 * for an older value is cancelled when a new value lands first.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}
