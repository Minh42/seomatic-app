'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Optimized cache configuration for better performance
            // Static data (organizations, plans) - 10 minutes
            staleTime: 10 * 60 * 1000,
            // Keep data in cache for 30 minutes (was 10)
            gcTime: 30 * 60 * 1000,
            // Retry failed requests with exponential backoff
            retry: (failureCount, error) => {
              if (failureCount >= 2) return false;
              // Don't retry on 4xx errors (client errors)
              if (error instanceof Error && error.message.includes('4')) {
                return false;
              }
              return true;
            },
            // Smart refetch strategy
            refetchOnWindowFocus: false,
            refetchOnReconnect: 'always',
            refetchOnMount: false,
            // Keep previous data while fetching (smoother UX)
            keepPreviousData: true,
          },
          mutations: {
            // Retry mutations once on network errors
            retry: 1,
            // Optimistic updates are handled per-mutation
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
