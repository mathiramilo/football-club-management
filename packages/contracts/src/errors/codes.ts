import { z } from 'zod';

export const errorCode = z.enum([
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
