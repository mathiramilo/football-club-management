import { type ArgumentMetadata, Injectable, StandardSchemaValidationPipe } from '@nestjs/common';
import type { FieldError } from '@repo/contracts';
import type { StandardSchemaV1 } from '@standard-schema/spec';

export class RequestValidationError extends Error {
  constructor(readonly errors: FieldError[]) {
    super('Request validation failed');
    this.name = 'RequestValidationError';
  }
}

class SchemaIssues extends Error {
  constructor(readonly issues: readonly StandardSchemaV1.Issue[]) {
    super('Schema validation failed');
  }
}

// A refinement names its own code through its message: `.refine(check, { message: 'REASON_REQUIRED' })`.
const CODE_MESSAGE = /^[A-Z][A-Z0-9_]*$/;

const escapePointerToken = (token: PropertyKey) =>
  String(token).replaceAll('~', '~0').replaceAll('/', '~1');

const pointerOf = (path: StandardSchemaV1.Issue['path'] = []) =>
  path
    .map((segment) => (typeof segment === 'object' ? segment.key : segment))
    .map((token) => `/${escapePointerToken(token)}`)
    .join('');

// Zod's issues carry their own `code` (`invalid_type`, `too_small`…), which Standard Schema doesn't type.
const issueCodeOf = (issue: StandardSchemaV1.Issue) =>
  'code' in issue && typeof issue.code === 'string' ? issue.code : 'invalid';

const toFieldError = (issue: StandardSchemaV1.Issue, location: FieldError['in']): FieldError =>
  CODE_MESSAGE.test(issue.message)
    ? { in: location, pointer: pointerOf(issue.path), code: issue.message }
    : {
        in: location,
        pointer: pointerOf(issue.path),
        code: issueCodeOf(issue),
        detail: issue.message,
      };

const locationOf = (type: ArgumentMetadata['type']): FieldError['in'] => {
  if (type === 'param') return 'path';
  if (type === 'query') return 'query';
  return 'body';
};

@Injectable()
export class RequestValidationPipe extends StandardSchemaValidationPipe {
  constructor() {
    super({ exceptionFactory: (issues) => new SchemaIssues(issues) });
  }

  override async transform<T>(value: T, metadata: ArgumentMetadata): Promise<T> {
    try {
      return await super.transform(value, metadata);
    } catch (error) {
      if (!(error instanceof SchemaIssues)) throw error;
      const location = locationOf(metadata.type);
      throw new RequestValidationError(error.issues.map((issue) => toFieldError(issue, location)));
    }
  }
}
