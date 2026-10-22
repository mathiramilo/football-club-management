---
name: notification
description: Add or change a push, email or in-app notification (N-01 to N-22 catalog in F10) - copy, scheduling, quiet hours, preferences, dedupe, inbox, Expo Push delivery and receipts, and actionable RSVP pushes. Use when implementing a NOTIF- story or any story that sends a notification.
argument-hint: <N-xx> [story ID]
---

# Notification

Specs: `docs/features/F10-notifications.md` (catalog and BR-NOTIF-*), ADR-008, `docs/tech/01-architecture-overview.md` § 6.4. Conventions are in the `jobs-and-notifications` rule. Scheduling mechanics are in the `background-job` skill.

## 1. Catalog entry

Find the `N-xx` row in F10: trigger, audience, channels (push, email, inbox), timing, mandatory or not, preference group, quiet-hours behavior, caps. If the notification isn't catalogued, stop: it needs an ID and a row in F10 first (and the range in `docs/README.md` updated).

## 2. Copy

In `packages/i18n`:

```text
notifications.N-03.push.title
notifications.N-03.push.body
notifications.N-03.inbox.body
notifications.N-03.email.subject   (only if the channel includes email)
```

- *Voseo*, short, and the action first: "¿Vas el martes 20:00? Confirmá antes de las 18:00."
- **Never** health data, absence reasons, notes or anything that would embarrass the player on a lock screen. Minors get the same content rules.
- Email templates are React Email components using the same catalog.
- Missing copy in the spec: propose it and flag it as a proposal for product review.

## 3. Scheduling

From an outbox handler (see `background-job`):
- compute the send time in the club time zone and shift it out of quiet hours with the `packages/domain` helper, unless the catalog marks it urgent;
- create one `notifications` row per recipient with `idempotency_key = N-xx:{entityId}:{userId}[:{variant}]` (unique), `status = scheduled`, `scheduled_for`;
- enqueue the dispatch job with `startAfter`.

## 4. Dispatch (worker)

1. Load the notification and its entity. **Re-check relevance** (BR-NOTIF-04): event cancelled or moved, already answered, membership ended, preference off, cap reached. If irrelevant, set `skipped` or `capped` with `skip_reason`.
2. Localize in the recipient's locale (BR-NOTIF-08).
3. Mark the inbox row as sent. The inbox works even if push fails (NFR-AVAIL-03).
4. Push to every active device through `expo-server-sdk`, in chunks. Store each ticket in `notification_deliveries`.
5. Include a deep link to the screen in the payload `data`. RSVP pushes use the notification category with Voy / No voy actions; the action submits through the same RSVP endpoint with `source = push_action` and an `Idempotency-Key`.
6. Skip push for managed profiles (no account, no devices).

## 5. Receipts

A scheduled job polls Expo push receipts, records results, and disables tokens that report `DeviceNotRegistered` (BR-NOTIF-12).

## 6. Mobile side

- Register categories and actions at startup with `expo-notifications`.
- Tapping a notification routes to its deep link. Handling the Voy action with the app killed or backgrounded depends on the R0 spike outcome (tech stack § 8).

## 7. Tests (mandatory)

- the audience is computed correctly (including call-ups and excluded roles);
- quiet hours shift the send time, and urgent types are not shifted;
- dedupe: scheduling twice creates one row;
- relevance: cancelled event, answered RSVP and disabled preference are skipped with the right `skip_reason`;
- the push payload contains no reason, note or health field;
- receipts disable dead tokens.
