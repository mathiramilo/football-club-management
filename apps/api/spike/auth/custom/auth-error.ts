export type AuthErrorCode =
  | 'ID_TOKEN_INVALID'
  | 'EMAIL_NOT_VERIFIED'
  | 'CODE_INVALID'
  | 'CODE_EXPIRED'
  | 'CODE_TOO_MANY_ATTEMPTS'
  | 'CODE_RESEND_TOO_SOON'
  | 'CODE_RATE_LIMITED'
  | 'REFRESH_TOKEN_INVALID'
  | 'REFRESH_TOKEN_EXPIRED'
  | 'REFRESH_TOKEN_REUSED'
  | 'ACCESS_TOKEN_INVALID'
  | 'SESSION_REVOKED';

export class AuthError extends Error {
  constructor(readonly code: AuthErrorCode) {
    super(code);
  }
}
