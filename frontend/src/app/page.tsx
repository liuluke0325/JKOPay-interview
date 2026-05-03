import { Suspense } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { HomeClient } from '@/components/HomeClient';

// Server component by default — only the interactive subtree
// (`HomeClient`) is `'use client'`. The header text comes from the i18n
// dictionary at request time, so it ships in the server-rendered HTML
// (no flash on hydration).
//
// `useSearchParams` inside `HomeClient` requires a Suspense boundary at
// the page level (Next.js App Router convention).
export default function Home() {
  return (
    <main className="flex flex-col flex-1 min-h-0">
      <AppHeader />
      <Suspense>
        <HomeClient />
      </Suspense>
    </main>
  );
}
