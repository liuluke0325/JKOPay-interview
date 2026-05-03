import { Suspense } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { SearchClient } from '@/components/SearchClient';

// /search — dedicated route per ADR-0009 + REQUIREMENTS §5.B (search
// is a separate screen, not an in-place filter on `/`). Server component
// renders the static header inline; the interactive subtree lives under
// Suspense (required by useSearchParams in the client leaf).
export default function SearchPage() {
  return (
    <main className="flex flex-col flex-1">
      <AppHeader />
      <Suspense>
        <SearchClient />
      </Suspense>
    </main>
  );
}
