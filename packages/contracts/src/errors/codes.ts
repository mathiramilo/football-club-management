import { z } from 'zod';

import { extensibleEnum } from '../extensible-enum.js';

export const errorCode = extensibleEnum([
  'BAD_REQUEST',
  'VALIDATION_FAILED',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'PAYLOAD_TOO_LARGE',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
  'SERVICE_UNAVAILABLE',
  'IDEMPOTENCY_KEY_REQUIRED',
  'IDEMPOTENCY_KEY_REUSED',
  'IDEMPOTENCY_REQUEST_IN_PROGRESS',
]);

export type ErrorCode = z.infer<typeof errorCode>;

export interface ErrorDefinition {
  status: number;
  title: string;
}

export const errorCatalog: Record<ErrorCode, ErrorDefinition> = {
  BAD_REQUEST: { status: 400, title: 'Bad request' },
  VALIDATION_FAILED: { status: 400, title: 'Invalid request' },
  UNAUTHENTICATED: { status: 401, title: 'Not signed in' },
  FORBIDDEN: { status: 403, title: 'Not allowed' },
  NOT_FOUND: { status: 404, title: 'Not found' },
  CONFLICT: { status: 409, title: 'Conflict' },
  PAYLOAD_TOO_LARGE: { status: 413, title: 'Request too large' },
  RATE_LIMITED: { status: 429, title: 'Too many requests' },
  INTERNAL_ERROR: { status: 500, title: 'Internal error' },
  SERVICE_UNAVAILABLE: { status: 503, title: 'Service unavailable' },
  IDEMPOTENCY_KEY_REQUIRED: { status: 400, title: 'Idempotency key required' },
  IDEMPOTENCY_KEY_REUSED: { status: 422, title: 'Idempotency key reused' },
  IDEMPOTENCY_REQUEST_IN_PROGRESS: { status: 409, title: 'Request in progress' },
};

// Better Auth answers /v1/auth/* with { code, message } instead of problem+json (ADR-007).
// These are the codes clients localize from those responses.
export const authErrorCode = z.enum([
  'CODE_RATE_LIMITED',
  'CODE_RESEND_TOO_SOON',
  'INVALID_OTP',
  'OTP_EXPIRED',
  'TOO_MANY_ATTEMPTS',
]);

export type AuthErrorCode = z.infer<typeof authErrorCode>;
