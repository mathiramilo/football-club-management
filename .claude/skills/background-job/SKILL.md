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
| Recurring work (purges, retention, receipt polling) | A `schedule` on the job queue; the worker registers it with pg-boss and drops schedules no queue declares |

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

Handlers live in `modules/<context>/jobs/`, in a `<Context>JobsModule` that only `WorkerModule` imports, so the API process never builds them. Declare the queue next to them, then mark the method with `@JobHandler`:

```ts
export const dispatchNotification = jobQueue(
  'notifications.dispatch',
  { notificationId: z.uuid() },
  { policy: 'short' },
);

@Injectable()
export class DispatchNotificationJob {
  @JobHandler(dispatchNotification)
  async run({ notificationId }: JobData<typeof dispatchNotification>, job: JobContext) {
    // ...
  }
}
```

On start, the worker creates every handled queue with the default retries (5, from 30 s doubling up to 15 min) and the shared `dead_letter` queue, then starts its workers. It refuses to start when two handlers claim one queue, or when a queue's policy no longer matches the database (a policy can't change in place: use a new queue name). Each job runs in its own CLS context, with data parsed by the queue's schema. Override `retryLimit`, `retryDelaySeconds`, `retryDelayMaxSeconds`, `expireInSeconds` or `concurrency` in the queue's settings only with a reason.

1. **Load fresh state** by ID. Never trust data in the payload beyond IDs.
2. **Check relevance**: is the work still needed? (Event cancelled or moved, RSVP already answered, membership ended, club deleted.) If not, return without side effects.
3. **Be idempotent**: a second run must not duplicate anything. Use a deterministic key with a unique constraint (insert … on conflict do nothing), or check-then-act inside a transaction.
4. **Compute times in the club time zone** with `packages/domain` helpers (quiet hours, wall-clock schedules). Get `now` from the injected clock.
5. **Keep transactions short**: never hold one open across a provider call. Pass `job.signal` to provider calls that accept one.

Scheduling a later job, from a handler (never from a request: the request writes an outbox event):

```ts
await this.jobs.send(
  dispatchNotification,
  { notificationId },
  {
    startAfter: sendAt,
    singletonKey: `N-03:${eventId}:${userId}:${offsetMin}`,
  },
);
```

`singletonKey` only de-duplicates on a queue whose policy says so: `short` keeps one waiting job per key, while a `standard` queue ignores the key. The database unique constraint is the real guarantee.

A recurring queue declares `schedule: { cron, tz }` and an empty data shape. `tz` defaults to UTC; use the club time zone only for a schedule that belongs to one club.

## 4. Rescheduling and cancellation

When the source changes (event moved or cancelled, settings changed), the handler for that change cancels or reschedules the dependent jobs by key. Relevance checks at execution are the safety net, not the plan.

## 5. Bursts and failures

- Jobs that fire for many categories at the same wall-clock time (Monday digests, 24 h reminders) get ±5 min jitter.
- Retries with backoff, then the `dead_letter` queue. The last failed attempt raises an alert through `JobAlerts`; dead-lettered jobs wait there for `boss.redrive()` (by `sourceName`) or deletion. A permanently invalid job (deleted entity) completes as skipped instead of retrying.
- pg-boss stores a failed job's error. The worker keeps only its name and stack frames, because messages can carry query arguments.

## 6. Tests (mandatory)

In `apps/api/test/<context>/`:
- the outbox row is written in the same transaction as the change (roll back the transaction → no row);
- scheduling computes the right instant in the club time zone, including quiet hours and a DST boundary;
- the relevance check skips cancelled or already-handled cases;
- running the handler twice produces one effect;
- providers are faked at their client boundary.

`startTestWorker([MyJobsModule])` (`test/support/test-worker.ts`) boots `WorkerModule` on its own pg-boss schema with pg-boss's `TestClock` and a `FakeJobAlerts`. Move time with `worker.clock.tick(POLL_MS)` (a poll) and `worker.clock.setTime(…)` (a jump), never with real waits; get a spy before sending (`worker.boss.getSpy(queue.name)`) and await `waitForJob(…, 'completed')`.
