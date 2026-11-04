import { Module, type OnApplicationShutdown, type OnModuleInit } from '@nestjs/common';
import { type Event, flush, getGlobalScope } from '@sentry/nestjs';
import { SentryModule } from '@sentry/nestjs/setup';
import { ClsServiceManager } from 'nestjs-cls';

import type { RequestContext } from '../request-context.js';

const FLUSH_TIMEOUT_MS = 2_000;

function withRequestContext(event: Event): Event {
  const cls = ClsServiceManager.getClsService<RequestContext>();
  if (!cls.isActive()) return event;
  const userId = cls.get('actor')?.userId;
  const job = cls.get('job');
  const tags = Object.fromEntries(
    Object.entries({
      request_id: cls.getId(),
      club_id: cls.get('clubActor')?.club.clubId,
      job_id: job?.id,
      queue: job?.queue,
    }).filter(([, value]) => value !== undefined),
  );
  return {
    ...event,
    ...(userId && { user: { id: userId } }),
    tags: { ...event.tags, ...tags },
  };
}

let contextAdded = false;

@Module({ imports: [SentryModule.forRoot()] })
export class ObservabilityModule implements OnModuleInit, OnApplicationShutdown {
  onModuleInit(): void {
    if (contextAdded) return;
    getGlobalScope().addEventProcessor(withRequestContext);
    contextAdded = true;
  }

  async onApplicationShutdown(): Promise<void> {
    await flush(FLUSH_TIMEOUT_MS);
  }
}
