import { HttpException } from '@nestjs/common';
import {
  errorCatalog,
  errorCode,
  type ErrorCode,
  type FieldError,
  type ProblemDetails,
} from '@repo/contracts';

import { Prisma } from '../../generated/prisma/client.js';
import { DomainError } from './domain-error.js';
import { RequestValidationError } from './request-validation.pipe.js';

export interface Problem {
  status: number;
  body: ProblemDetails;
}

const CODE_BY_STATUS: Partial<Record<number, ErrorCode>> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  429: 'RATE_LIMITED',
  503: 'SERVICE_UNAVAILABLE',
};

const CODE_BY_PRISMA_ERROR: Partial<Record<string, ErrorCode>> = {
  P2002: 'CONFLICT',
  P2025: 'NOT_FOUND',
};

const problemType = (code: ErrorCode) => `/problems/${code.toLowerCase().replaceAll('_', '-')}`;

function problem(
  code: ErrorCode,
  extra: { status?: number; detail?: string; errors?: FieldError[] } = {},
): Problem {
  const { status = errorCatalog[code].status, detail, errors } = extra;
  return {
    status,
    body: {
      type: problemType(code),
      title: errorCatalog[code].title,
      status,
      code,
      ...(detail !== undefined && { detail }),
      ...(errors !== undefined && { errors }),
    },
  };
}

function fromHttpException(exception: HttpException): Problem {
  const status = exception.getStatus();
  const declared = errorCode.safeParse(exception.errorCode);
  const code = declared.success
    ? declared.data
    : (CODE_BY_STATUS[status] ?? (status >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST'));
  return problem(code, { status });
}

export function toProblem(exception: unknown): Problem {
  if (exception instanceof DomainError)
    return problem(exception.code, { detail: exception.detail });
  if (exception instanceof RequestValidationError) {
    return problem('VALIDATION_FAILED', { errors: exception.errors });
  }
  if (exception instanceof HttpException) return fromHttpException(exception);
  if (exception instanceof Prisma.PrismaClientKnownRequestError) {
    const code = CODE_BY_PRISMA_ERROR[exception.code];
    if (code) return problem(code);
  }
  return problem('INTERNAL_ERROR');
}
