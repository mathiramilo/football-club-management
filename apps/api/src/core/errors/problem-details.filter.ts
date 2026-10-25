import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

import { framesOf, nameOf } from './redacted-error.js';
import { toProblem } from './to-problem.js';

@Catch()
@Injectable()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  constructor(private readonly adapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() !== 'http') throw exception;

    const { status, body } = toProblem(exception);
    if (status >= 500 && !(exception instanceof HttpException)) {
      this.logger.error(`Unhandled ${nameOf(exception)}`, framesOf(exception));
    }

    const { httpAdapter } = this.adapterHost;
    const response: unknown = host.switchToHttp().getResponse();
    httpAdapter.setHeader(response, 'Content-Type', 'application/problem+json');
    httpAdapter.reply(response, body, status);
  }
}
