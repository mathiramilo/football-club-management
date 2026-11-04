'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

import { UpdateRequired } from '@/components/update-required';
import { setUpApiClient } from '@/lib/api-client';
import { useIsUpdateRequired } from '@/lib/app-update';
import { makeQueryClient } from '@/lib/query-client';

if (typeof window !== 'undefined') setUpApiClient();

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(makeQueryClient);
  const isUpdateRequired = useIsUpdateRequired();

  return (
    <QueryClientProvider client={queryClient}>
      {isUpdateRequired ? <UpdateRequired /> : children}
    </QueryClientProvider>
  );
}
