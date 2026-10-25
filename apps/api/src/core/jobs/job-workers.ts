import {
  type BeforeApplicationShutdown,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleInit,
} from '@nestjs/common';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { ClsService } from 'nestjs-cls';
import { type JobWithMetadata, PgBoss } from 'pg-boss';

import { framesOf, nameOf } from '../errors/redacted-error.js';
import { JobAlerts } from './job-alerts.js';
import { HandlesQueue, type JobHandlerMethod, type JobQueue } from './job-queue.js';

export const DEAD_LETTER_QUEUE = 'dead_letter';

const STOP_TIMEOUT_MS = 30_000;

interface Registration {
  readonly queue: JobQueue;
  readonly handler: JobHandlerMethod<JobQueue>;
  readonly owner: string;
}

// pg-boss stores a failed job's error, and error messages can carry query arguments.
class JobFailure extends Error {
  constructor(cause: unknown) {
    super(nameOf(cause));
    this.name = 'JobFailure';
    this.stack = `${this.name}: ${this.message}\n${framesOf(cause) ?? ''}`;
  }
}

@Injectable()
export class JobWorkers implements OnModuleInit, OnApplicationBootstrap, BeforeApplicationShutdown {
  private readonly logger = new Logger(JobWorkers.name);
  private registrations: Registration[] = [];

  constructor(
    private readonly boss: PgBoss,
    private readonly alerts: JobAlerts,
    private readonly cls: ClsService,
    private readonly discovery: DiscoveryService,
    private readonly scanner: MetadataScanner,
    private readonly reflector: Reflector,
  ) {
    boss.on('error', (error) => {
      alerts.queueFailed(error);
    });
    boss.on('warning', ({ message }) => {
      this.logger.warn(message);
    });
  }

  async onModuleInit(): Promise<void> {
    this.registrations = this.discoverHandlers();
    await this.boss.start();
    await this.boss.createQueue(DEAD_LETTER_QUEUE);
    for (const { queue } of this.registrations) await this.ensureQueue(queue);
    await this.syncSchedules();
  }

  async onApplicationBootstrap(): Promise<void> {
    for (const registration of this.registrations) {
      const { name, settings } = registration.queue;
      await this.boss.work(
        name,
        { includeMetadata: true, localConcurrency: settings.concurrency ?? 1 },
        async (jobs) => {
          for (const job of jobs) await this.run(registration, job);
        },
      );
    }
  }

  async beforeApplicationShutdown(): Promise<void> {
    await this.boss.stop({ graceful: true, timeout: STOP_TIMEOUT_MS });
  }

  private discoverHandlers(): Registration[] {
    const registrations = this.discovery.getProviders().flatMap((wrapper): Registration[] => {
      const instance: unknown = wrapper.instance;
      if (typeof instance !== 'object' || instance === null) return [];
      const prototype = Object.getPrototypeOf(instance) as object | null;
      if (!prototype) return [];
      return this.scanner.getAllMethodNames(prototype).flatMap((name) => {
        const method: unknown = Reflect.get(prototype, name);
        if (typeof method !== 'function') return [];
        const queue = this.reflector.get<JobQueue | undefined>(HandlesQueue.KEY, method);
        if (!queue) return [];
        const handler = method.bind(instance) as JobHandlerMethod<JobQueue>;
        return [{ queue, handler, owner: `${instance.constructor.name}.${name}` }];
      });
    });

    const owners = new Map<string, string>();
    for (const { queue, owner } of registrations) {
      const other = owners.get(queue.name);
      if (other) throw new Error(`${owner} and ${other} both handle the job queue ${queue.name}`);
      if (queue.settings.schedule && !queue.data.safeParse({}).success) {
        throw new Error(
          `${owner} handles ${queue.name}, a scheduled queue whose data is not empty`,
        );
      }
      owners.set(queue.name, owner);
    }
    return registrations;
  }

  // NFR-AVAIL-04: 5 retries 30 s apart, doubling up to 15 min, then the dead-letter queue.
  private async ensureQueue({ name, settings }: JobQueue): Promise<void> {
    const policy = settings.policy ?? 'standard';
    const options = {
      retryLimit: settings.retryLimit ?? 5,
      retryDelay: settings.retryDelaySeconds ?? 30,
      retryBackoff: true,
      retryDelayMax: settings.retryDelayMaxSeconds ?? 15 * 60,
      expireInSeconds: settings.expireInSeconds ?? 15 * 60,
      deadLetter: DEAD_LETTER_QUEUE,
    };

    const existing = await this.boss.getQueue(name);
    if (existing && existing.policy !== policy) {
      throw new Error(
        `Job queue ${name} has the ${existing.policy ?? 'standard'} policy, not ${policy}; a policy cannot change in place`,
      );
    }
    await this.boss.createQueue(name, { policy, ...options });
    await this.boss.updateQueue(name, options);
  }

  private async syncSchedules(): Promise<void> {
    const scheduled = new Set<string>();
    for (const { queue } of this.registrations) {
      const { schedule } = queue.settings;
      if (!schedule) continue;
      await this.boss.schedule(queue.name, schedule.cron, {}, { tz: schedule.tz ?? 'UTC' });
      scheduled.add(queue.name);
    }
    for (const { name, key } of await this.boss.getSchedules()) {
      if (!scheduled.has(name)) await this.boss.unschedule(name, key);
    }
  }

  private async run(
    { queue, handler }: Registration,
    job: JobWithMetadata<unknown>,
  ): Promise<void> {
    try {
      const data = queue.data.parse(job.data);
      await this.cls.run(() => handler(data, { id: job.id, signal: job.signal }));
    } catch (error) {
      if (job.retryCount >= job.retryLimit) {
        this.alerts.deadLettered({ queue: queue.name, jobId: job.id }, error);
      }
      throw new JobFailure(error);
    }
  }
}
