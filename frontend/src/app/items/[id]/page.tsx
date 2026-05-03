import { Suspense } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { BackButton } from '@/components/BackButton';
import { ItemDetail } from '@/components/ItemDetail';

// Server-component shell. The detail body fetches via TanStack Query
// in the client subtree (so error / loading / not-found states share
// the same pattern as the list pages). The `id` from the dynamic
// segment is forwarded as a prop.
//
// Next.js 15+ turns `params` into a Promise (App Router async params).
export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="flex flex-col flex-1 min-h-0">
      <AppHeader leadingSlot={<BackButton />} />
      <Suspense>
        <ItemDetail id={id} />
      </Suspense>
    </main>
  );
}
