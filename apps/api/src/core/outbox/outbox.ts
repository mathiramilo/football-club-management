import { Injectable, Module } from '@nestjs/common';

import type { Prisma } from '../../generated/prisma/client.js';
import type { DomainEvent, DomainEventPayload } from './domain-event.js';

export interface OutboxTransaction {
  outboxEvent: {
    create(args: { data: { type: string; payload: Prisma.InputJsonObject } }): PromiseLike<unknown>;
  };
}

@Injectable()
export class Outbox {
  async add<Event extends DomainEvent>(
    tx: OutboxTransaction,
    event: Event,
    payload: DomainEventPayload<Event>,
  ): Promise<void> {
    await tx.outboxEvent.create({
      data: { type: event.type, payload: event.payload.parse(payload) },
    });
  }
}

@Module({
  providers: [Outbox],
  exports: [Outbox],
})
export class OutboxModule {}
