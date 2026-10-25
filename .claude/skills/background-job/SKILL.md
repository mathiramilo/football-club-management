---
name: background-job
description: Add a background job, scheduled task or cross-module side effect in the API worker using the transactional outbox and pg-boss - reminders, digests, roll-call nudges, wellness cycles, scheduled publishing, series materialization, purges. Use when work must run later, on a schedule, or as a reaction to a domain event in another module.
argument-hint: <job purpose> [story ID]
---

# Background job (outbox + pg-boss)

Specs: `docs/tech/01-architecture-overview.md` § 6.4, ADR-006, NFR-AVAIL-04, NFR-SCALE-03. Conventions are in the `jobs-and-notifications` rule. For notifications, also use the `notification` skill.

## 1. Pick the trigger

| Trigger | Mechanism |
|---|---|
| A state change in module A must cause work in module B | Domain event in the **outbox**, written in A's transaction; B's handler runs in the worker |
| Work at a computed time (reminder, nudge, scheduled publish) | pg-boss job with `startAfter`, scheduled from an outbox handler |
| Recurring work (purges, retention, receipt polling) | pg-boss cron schedule registered in `worker.ts` |

## 2. Emit the domain event

Declare the event once in `modules/<context>/events/`, with a payload of IDs and scalars only. `domainEvent` makes the payload strict, so a field the event doesn't declare (a name, a note, a whole entity) throws instead of reaching the outbox.

```ts
export const eventCreated = domainEvent('events.event_created', {
  clubId: z.uuid(),
  eventId: z.uuid(),
});
```

Write it with `Outbox` (`core/outbox`, import `OutboxModule`) in the same transaction as the change:

```ts
await this.prisma.forClub(club).$transaction(async (tx) => {
  const event = await this.eventsRepository.create(tx, club, input);
  await this.outbox.add(tx, eventCreated, { clubId: club.clubId, eventId: event.id });
});
```

Name events `<module>.<entity>_<past_tense_verb>`: `clubs.membership_started`, `events.event_rescheduled`, `events.event_cancelled`.

## 3. Write the handler

Handlers live in `modules/<context>/jobs/` of the module that owns the reaction.

1. **Load fresh state** by ID. Never trust data in the payload beyond IDs.
2. **Check relevance**: is the work still needed? (Event cancelled or moved, RSVP already answered, membership ended, club deleted.) If not, return without side effects.
3. **Be idempotent**: a second run must not duplicate anything. Use a deterministic key with a unique constraint (insert … on conflict do nothing), or check-then-act inside a transaction.
4. **Compute times in the club time zone** with `packages/domain` helpers (quiet hours, wall-clock schedules). Get `now` from the injected clock.
5. **Keep transactions short**: never hold one open across a provider call.

Scheduling a later job:

```ts
await this.jobs.send(
  'notifications.dispatch',
  { notificationId },
  {
    startAfter: sendAt,
    singletonKey: `N-03:${eventId}:${userId}:${offsetMin}`,
  },
);
```

In pg-boss 10+, create queues with `createQueue` (with retry, backoff and dead-letter options) before sending, and `work` handlers receive an array of jobs. Check `singletonKey` semantics against the queue policy of the pinned version; the database unique constraint is the real guarantee.

## 4. Rescheduling and cancellation

When the source changes (event moved or cancelled, settings changed), the handler for that change cancels or reschedules the dependent jobs by key. Relevance checks at execution are the safety net, not the plan.

## 5. Bursts and failures

- Jobs that fire for many categories at the same wall-clock time (Monday digests, 24 h reminders) get ±5 min jitter.
- Retries with backoff, then a dead-letter queue with an alert. A permanently invalid job (deleted entity) completes as skipped instead of retrying.

## 6. Tests (mandatory)

In `apps/api/test/<context>/`:
- the outbox row is written in the same transaction as the change (roll back the transaction → no row);
- scheduling computes the right instant in the club time zone, including quiet hours and a DST boundary;
- the relevance check skips cancelled or already-handled cases;
- running the handler twice produces one effect;
- providers are faked at their client boundary.
