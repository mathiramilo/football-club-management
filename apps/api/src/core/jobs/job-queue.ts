import { Reflector } from '@nestjs/core';
import { z } from 'zod';

import type { PayloadShape } from '../outbox/domain-event.js';

export interface QueueSettings {
  readonly policy?: 'standard' | 'short' | 'singleton' | 'stately' | 'exclusive';
  readonly retryLimit?: number;
  readonly retryDelaySeconds?: number;
  readonly retryDelayMaxSeconds?: number;
  readonly expireInSeconds?: number;
  readonly concurrency?: number;
  readonly schedule?: { readonly cron: string; readonly tz?: string };
}

export interface JobQueue<Name extends string = string, Shape extends PayloadShape = PayloadShape> {
  readonly name: Name;
  readonly data: z.ZodObject<Shape, z.core.$strict>;
  readonly settings: QueueSettings;
}

export type JobData<Queue extends JobQueue> = z.output<Queue['data']>;

export function jobQueue<const Name extends `${string}.${string}`, Shape extends PayloadShape>(
  name: Name,
  shape: Shape,
  settings: QueueSettings = {},
): JobQueue<Name, Shape> {
  return { name, data: z.strictObject(shape), settings };
}

export interface JobContext {
  readonly id: string;
  readonly signal: AbortSignal;
}

export type JobHandlerMethod<Queue extends JobQueue> = (
  data: JobData<Queue>,
  job: JobContext,
) => Promise<void> | void;

export const HandlesQueue = Reflector.createDecorator<JobQueue>();

export function JobHandler<Queue extends JobQueue>(queue: Queue) {
  return <Method extends JobHandlerMethod<Queue>>(
    target: object,
    key: string | symbol,
    descriptor: TypedPropertyDescriptor<Method>,
  ): void => {
    HandlesQueue(queue)(target, key, descriptor);
  };
}
