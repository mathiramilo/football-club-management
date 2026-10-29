import { ApiError } from '@repo/api-client';
import { QueryClient } from '@tanstack/react-query';

const MAX_QUERY_RETRIES = 3;
const RETRIED_CLIENT_ERRORS = new Set([408, 429]);

const isFinalError = (error: Error) =>
  error instanceof ApiError && error.status < 500 && !RETRIED_CLIENT_ERRORS.has(error.status);

const shouldRetry = (failureCount: number, error: Error) =>
  !isFinalError(error) && failureCount < MAX_QUERY_RETRIES;

export const makeQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: shouldRetry }, mutations: { retry: 0 } },
  });
