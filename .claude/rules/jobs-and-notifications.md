---
paths:
  - "apps/api/src/worker.ts"
  - "apps/api/src/**/jobs/**"
  - "apps/api/src/**/events/**"
  - "apps/api/src/core/outbox/**"
  - "apps/api/src/core/jobs/**"
  - "apps/api/src/modules/notifications/**"
---

# Background jobs, outbox and notifications

Specs: `docs/tech/01-architecture-overview.md` § 6.4, ADR-006, ADR-008, `docs/features/F10-notifications.md`. See the `background-job` and `notification` skills.

## Outbox and jobs

- A command writes its state change **and** an `outbox_events` row in the same transaction. The worker relays outbox rows to pg-boss queues. Never enqueue a job or call a provider directly from a request handler as a side effect of a write.
- Delivery is at-least-once, so **every handler is idempotent**: running it twice has the same effect as once.
- The outbox relay claims rows with `FOR UPDATE SKIP LOCKED` in short transactions, so several workers never block each other. Idempotency keys are written with `INSERT … ON CONFLICT DO NOTHING`. Work that must run once at a time (purges, receipt polling) takes an advisory lock or a pg-boss singleton.
- Job payloads carry IDs (`clubId`, `eventId`, `membershipId`), never personal or health data. Handlers load fresh state.
- Scheduled work uses `startAfter`. De-duplication uses a deterministic key (e.g. `N-03:{eventId}:{userId}:{offsetMin}`), enforced by the `notifications.idempotency_key` unique constraint; pg-boss `singletonKey` is an extra guard (BR-NOTIF-03).
- **Re-check relevance at execution time** (BR-NOTIF-04): the event may be cancelled or moved, the RSVP already answered, the membership ended, or the preference turned off. Skip and record `skip_reason` rather than send.
- When an event's time changes, reschedule its time-based jobs from the new time; don't leave the old ones to fire.
- Spread burst jobs (digests, Monday reminders) with ±5 min jitter (NFR-SCALE-03).
- Retries with backoff (5 retries from 30 s, doubling up to 15 min), then the `dead_letter` queue with an alert (NFR-AVAIL-04).
- Handlers get the time from the injected clock, and evaluate wall-clock rules in the club time zone.
- Queues are declared with `jobQueue(name, dataShape, settings)`, or `eventQueue(name, domainEvent, settings)` for a reaction to a domain event, and handled with `@JobHandler(queue)`; the worker creates them, with retries and the dead-letter queue, before any job runs. Send with `Jobs.send(queue, data, options)`, never with pg-boss directly. Jobs modules are imported by `WorkerModule` only.

## Notifications

- The catalog is `N-01`–`N-22` in F10: trigger, audience, channels, timing, preference group, whether it is mandatory. A new notification gets an ID there first.
- Quiet hours (default 22:00–08:00 club time, BR-NOTIF-01) shift non-urgent pushes using the `packages/domain` helper. Respect per-user caps.
- Always write the **inbox** row, even if push fails (NFR-AVAIL-03).
- Localize at send time in the recipient's locale (BR-NOTIF-08) from `packages/i18n`. **Push text never contains health data, absence reasons or notes.**
- Send through Expo Push (`expo-server-sdk`) in chunks; record `notification_deliveries`; poll receipts and disable dead tokens (BR-NOTIF-12).
- Managed profiles have no devices: skip push for them.
