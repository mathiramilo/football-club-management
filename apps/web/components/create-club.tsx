'use client';

import { CreateClubForm } from '@/components/create-club-form';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsClient } from '@/lib/use-is-client';

export function CreateClub() {
  const isClient = useIsClient();

  if (!isClient) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-5 py-6">
        <Skeleton className="h-24" />
        <Skeleton className="h-64" />
      </main>
    );
  }
  return <CreateClubForm />;
}
