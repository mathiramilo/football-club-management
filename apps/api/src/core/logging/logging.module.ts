import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { destination, type DestinationStream } from 'pino';

import type { Env } from '../config/env.js';
import { loggerOptions, requestLoggingOptions } from './log-options.js';

export const LOG_STREAM = Symbol('LOG_STREAM');

@Module({
  providers: [
    {
      provide: LOG_STREAM,
      inject: [ConfigService],
      useFactory: async (config: ConfigService<Env, true>): Promise<DestinationStream> =>
        config.get('LOG_FORMAT', { infer: true }) === 'pretty'
          ? (await import('pino-pretty')).default({ ignore: 'pid,hostname' })
          : destination(1),
    },
  ],
  exports: [LOG_STREAM],
})
class LogStreamModule {}

@Module({
  imports: [
    LoggerModule.forRootAsync({
      imports: [LogStreamModule],
      inject: [ConfigService, LOG_STREAM],
      useFactory: (config: ConfigService<Env, true>, stream: DestinationStream) => ({
        pinoHttp: [
          {
            ...loggerOptions({
              LOG_LEVEL: config.get('LOG_LEVEL', { infer: true }),
              LOG_FORMAT: config.get('LOG_FORMAT', { infer: true }),
            }),
            ...requestLoggingOptions(),
          },
          stream,
        ],
      }),
    }),
  ],
})
export class LoggingModule {}
