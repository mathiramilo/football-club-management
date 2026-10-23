import type { ErrorCode } from '@repo/contracts';

export class DomainError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly detail?: string,
  ) {
    super(code);
    this.name = 'DomainError';
  }
}
