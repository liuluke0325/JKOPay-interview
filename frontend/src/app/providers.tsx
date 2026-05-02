'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, type ReactNode } from 'react';

// Single QueryClient per browser tab. `useState` (not module-level) so
// React's strict-mode double-render in dev doesn't share state across
// remounts unexpectedly, and so SSR doesn't share state across requests.
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Avoid refetching on tab focus during dev — UI churns less while
            // we're iterating. Production can decide separately.
            refetchOnWindowFocus: false,
            // Show errors instead of silently retrying — easier to debug
            // during M3-C wiring. Re-enable retries before submission.
            retry: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
      )}
    </QueryClientProvider>
  );
}
