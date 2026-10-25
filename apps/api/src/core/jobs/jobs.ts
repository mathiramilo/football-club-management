import { Injectable } from '@nestjs/common';
import { PgBoss } from 'pg-boss';

import type { JobData, JobQueue } from './job-queue.js';

export interface SendOptions {
  readonly startAfter?: Date;
  readonly singletonKey?: string;
}

@Injectable()
export class Jobs {
  constructor(private readonly boss: PgBoss) {}

  async send<Queue extends JobQueue>(
    queue: Queue,
    data: JobData<Queue>,
    options: SendOptions = {},
  ): Promise<void> {
    await this.boss.send(queue.name, queue.data.parse(data), options);
  }
}
