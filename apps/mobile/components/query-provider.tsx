import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';

import { persistOptions, queryClient } from '@/lib/query-client';

const resumeQueuedWrites = () => queryClient.resumePausedMutations();

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={persistOptions}
      onSuccess={resumeQueuedWrites}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
