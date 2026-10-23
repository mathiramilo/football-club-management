import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  IDEMPOTENCY_KEY_HEADER,
  IDEMPOTENT_REPLAYED_HEADER,
  idempotencyKey,
  problemDetails,
} from '@repo/contracts';
import type { Request, Response } from 'express';
import { ClsService } from 'nestjs-cls';
import { catchError, mergeMap, type Observable, of } from 'rxjs';

import { Clock } from '../clock/clock.js';
import { DomainError } from '../errors/domain-error.js';
import { ReplayedProblem } from '../errors/replayed-problem.js';
import { toProblem } from '../errors/to-problem.js';
import type { RequestContext } from '../request-context.js';
import type { Claim } from './claim.js';
import { IdempotencyKeysRepository } from './idempotency-keys.repository.js';
import { IdempotencyKeyRequired } from './requires-idempotency-key.decorator.js';
import { fingerprintRequest } from './request-fingerprint.js';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly keys: IdempotencyKeysRepository,
    private readonly clock: Clock,
    private readonly cls: ClsService<RequestContext>,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    if (context.getType() !== 'http') return next.handle();
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    if (!MUTATING_METHODS.has(request.method)) return next.handle();

    const header = request.headers[IDEMPOTENCY_KEY_HEADER];
    if (header === undefined) {
      if (this.reflector.get<true | undefined>(IdempotencyKeyRequired.KEY, context.getHandler())) {
        throw new DomainError('IDEMPOTENCY_KEY_REQUIRED');
      }
      return next.handle();
    }
    const key = idempotencyKey.safeParse(header);
    if (!key.success)
      throw new DomainError('IDEMPOTENCY_KEY_REQUIRED', 'Idempotency-Key must be a UUID');

    // Keys are scoped to the user, so a public route has nothing to scope one to.
    const actor = this.cls.get('actor');
    if (!actor) return next.handle();

    const requestHash = fingerprintRequest(request.method, request.originalUrl, request.body);
    const claim = await this.keys.claim(actor.userId, key.data, requestHash, this.clock.now());
    const response = http.getResponse<Response>();
    switch (claim.outcome) {
      case 'reused':
        throw new DomainError('IDEMPOTENCY_KEY_REUSED');
      case 'in_progress':
        throw new DomainError('IDEMPOTENCY_REQUEST_IN_PROGRESS');
      case 'replay':
        return this.replay(response, claim);
      case 'proceed':
        return this.record(next, response, actor.userId, key.data);
    }
  }

  private replay(response: Response, { status, body }: Extract<Claim, { outcome: 'replay' }>) {
    response.setHeader(IDEMPOTENT_REPLAYED_HEADER, 'true');
    if (status >= 400) throw new ReplayedProblem({ status, body: problemDetails.parse(body) });
    response.status(status);
    return of(body ?? undefined);
  }

  private record(next: CallHandler, response: Response, userId: string, key: string) {
    return next.handle().pipe(
      mergeMap(async (body: unknown) => {
        await this.keys.complete(userId, key, response.statusCode, body);
        return body;
      }),
      catchError(async (error: unknown) => {
        const problem = toProblem(error);
        if (problem.status < 500)
          await this.keys.complete(userId, key, problem.status, problem.body);
        else await this.keys.release(userId, key);
        throw error;
      }),
    );
  }
}
