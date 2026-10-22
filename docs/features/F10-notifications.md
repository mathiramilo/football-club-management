# F10 — Notifications

> Status: **Draft v0.1** · Release: **R1** (core), extended in R2–R3 · Owner: Product · Last updated: 2026-10-22
> Source: Notion (automated attendance reminders; weekly wellness reminders) · Related: [F03](F03-events-and-attendance.md) · [F07](F07-player-wellness.md) · OQ-20

## 1. Goal

Get the **right person** to act at the **right moment**, without turning the app into spam. Notifications are the main replacement for "chasing players on WhatsApp". Notification fatigue is also the fastest way to get the app muted or uninstalled.

The Notion brief mentions automated attendance reminders and weekly wellness reminders. This document turns that into a **notification catalog** with defaults, plus delivery rules: quiet hours, caps, de-duplication, actionable pushes and channel fallbacks.

## 2. Channels

| Channel | Use | Release |
|---|---|---|
| **Push (mobile)** | Primary channel for everything time-sensitive. | R1 |
| **In-app inbox** | Every notification is also stored here (90 days). The source of truth for "what did I miss". | R1 |
| **Email** | Sign-in codes, guardian consent, account deletion, and critical fallback (cancellation within 24 h) for users with no active push token. | R1 |
| **Web push** | Staff on desktop. | Later |
| **WhatsApp (Business API)** | Reach players who never install the app. Costs per message and needs template approval (OQ-20). | Later |
| **Share sheet → WhatsApp** | Staff manually share event links and lists. Not a system notification, but a core part of the flow. | R1 |

## 3. Notification catalog

Defaults are per category where noted (category settings, [F02](F02-clubs-categories-and-membership.md) CLUB-14). "Mandatory" means the user cannot disable it.

| ID | Name | Audience | Trigger and timing (default) | Channels | Mandatory | Release |
|---|---|---|---|---|---|---|
| N-01 | Event invitation | Invitees | **One-off events**: on creation if the start is ≤ 14 days away; otherwise 7 days before. **Series instances**: none (covered by N-02). **Call-ups and late joiners**: on being added, if the start is ≤ 7 days away. Actions: Voy / No voy. | Push, inbox | No | R1 |
| N-02 | Weekly agenda | Players with events in the next 7 days | Category setting (default Monday 10:00). **One per player per club**, sent at the earliest digest time among the player's categories in that club that have the digest on. From R2 it absorbs a due N-11 (BR-NOTIF-14). Opens "Tu semana" (EVT-18). If only one event is pending, it carries Voy / No voy actions. | Push, inbox | No | R1 |
| N-03 | RSVP reminder | `pending` invitees | Start − 24 h and deadline − 1 h (category settings), with the spacing rule in BR-NOTIF-13. Skipped if answered. Actions: Voy / No voy. | Push, inbox | No | R1 |
| N-04 | Manual nudge | `pending` invitees | Staff action (EVT-13). Max 1 per event every 2 h. | Push, inbox | No | R1 |
| N-05 | Event changed | Invitees | Date or time change (with or without reconfirm), venue change, or other changes when staff choose to notify (BR-EVT-13, BR-EVT-14). Also sent when a cancelled event is restored (BR-EVT-15). | Push, inbox | **Yes** | R1 |
| N-06 | Event cancelled | Invitees | Immediately on cancellation. Ignores quiet hours if the start is ≤ 24 h away. Email fallback if no push token. | Push, inbox, email (fallback) | **Yes** | R1 |
| N-07 | Late drop-out | Event staff | A player changes `going` → `not_going` after the deadline. Batched per event within 15 minutes. | Push, inbox | No | R1 |
| N-08 | Roll-call reminder | Event staff | End + 15 min, then 10:00 the next day if roll call is still missing (BR-EVT-22). | Push, inbox | No | R1 |
| N-09 | Join request pending | Approvers per BR-CLUB-09 (Club Admins only for DT requests) | New request, or a possible duplicate after a direct join (BR-CLUB-10). Debounced to at most 1 per category every 30 min. | Push, inbox | No | R1 |
| N-10 | Join request approved | The requester | On approval of their join request. Additions by staff use N-18. | Push, inbox | No | R1 |
| N-11 | Wellness check-in open | Consenting players not covered | Category check-in moment (BR-WELL-05). Max 1 per 48 h across categories. | Push, inbox | No | R2 |
| N-12 | Wellness last call | Consenting players not covered | 24 h after N-11. | Push, inbox | No | R2 |
| N-13 | Wellness red flag | Staff of the player's categories | Red check-in, max 1 per player per 24 h. **No personal details in the push content** (BR-WELL-18). | Push, inbox | No | R2 |
| N-14 | Session plan published | Invitees | When staff tick "Avisar a los jugadores" on publish (BR-PLAN-06). | Push, inbox | No | R2 |
| N-15 | Routine / nutrition plan assigned | Assigned players | On assignment, or on a flagged important update (BR-CONT-06). | Push, inbox | No | R3 |
| N-16 | AI plan ready | Requesting staff member | An AI generation completes after the user left the screen (AI-01). | Push, inbox | No | R3 |
| N-17 | Guardian consent request | Guardian (no account) | Minor requests consent (BR-WELL-13). Re-send once per 24 h. | Email | — | R2 |
| N-18 | Membership or role changed | The member affected | Added to or removed from a category, staff role change, moved, Club Admin granted or revoked, ownership transferred (BR-ROLE-08, CLUB-12). | Push, inbox | **Yes** | R1 |
| N-19 | Club administration changes | Club Admins other than the member affected (who gets N-18) | Admin granted or revoked, ownership transfer, club deletion scheduled (CLUB-12, BR-CLUB-13). | Push, inbox, email | **Yes** | R1 |
| N-20 | Removed from an event | The player | Removed from an event they had answered `going`, by staff or by a roster or category change (BR-EVT-04, BR-CLUB-05). | Push, inbox | No | R1 |
| N-21 | RSVP changed by staff | The player | Staff overwrote the player's own answer with a proxy RSVP (BR-EVT-10). | Push, inbox | No | R1 |
| N-22 | Guardian consent update | The minor player | The guardian accepted, or the request expired or bounced (WELL-02, BR-WELL-13). | Push, inbox | No | R2 |

## 4. Delivery rules

| ID | Rule |
|---|---|
| BR-NOTIF-01 | **Quiet hours**: 22:00–08:00 in the club's time zone by default (configurable per club). Non-mandatory notifications due during quiet hours are moved to the **last slot before quiet hours begin** (21:30) when the triggering moment would otherwise be missed (e.g. the RSVP deadline); otherwise to 08:00. Mandatory N-05 and N-06 respect quiet hours unless the event starts within 24 h. |
| BR-NOTIF-02 | **Daily cap**: at most **4 non-mandatory pushes per user per day**. Notifications beyond the cap are still written to the inbox. Priority when capping: N-03 deadline reminder > N-01 > N-02 > others. |
| BR-NOTIF-03 | **De-duplication**: each notification has an idempotency key `(type, entity, recipient, scheduled_slot)`. Retries never cause duplicates. |
| BR-NOTIF-04 | **Relevance check at send time**: scheduled notifications are re-evaluated just before sending. Examples: a reminder is skipped if the player answered or the event was cancelled; a wellness reminder is skipped if the player is now covered. |
| BR-NOTIF-05 | **Collapsing**: notifications of the same type and entity replace each other in the device tray where supported (e.g. a second change to the same event replaces the first). |
| BR-NOTIF-06 | **Actionable pushes**: N-01, N-02 (single-event case) and N-03 show **Voy** and **No voy** actions. Voy is submitted in the background; No voy opens the reason picker (EVT-09). |
| BR-NOTIF-07 | **Deep links**: every notification opens the most specific screen (event, check-in, plan, request) and handles signed-out and no-access states. |
| BR-NOTIF-08 | **Localization**: content uses the recipient's language and formats times in the club time zone. Templates are written with short titles (≤ 40 characters) and bodies (≤ 120 characters) for lock-screen readability. |
| BR-NOTIF-09 | **Privacy**: push content never includes health data, absence reasons or other players' personal data (beyond names in the event title context). |
| BR-NOTIF-10 | **Push permission**: requested after the first RSVP or check-in, after an explanation screen (BR-AUTH-13). If denied, the app shows a persistent but dismissible banner in the agenda explaining what the user misses, with a link to system settings. |
| BR-NOTIF-11 | **Preferences**: each user can turn off non-mandatory notification groups: *Actividades* (N-01–N-04, N-20, N-21), *Avisos al cuerpo técnico* (N-07–N-09), *Alertas de estado físico* (N-13), *Estado físico* (N-11, N-12, N-22), *Contenido* (N-14, N-15), *Club* (N-10), *Asistente IA* (N-16). Preferences apply per club. |
| BR-NOTIF-12 | **Token hygiene**: invalid or unregistered push tokens are removed on the provider's feedback. Tokens are re-registered on each app start. Signing out unregisters the device. |
| BR-NOTIF-13 | **Reminder spacing**: an N-03 that would fall at or after the event's RSVP deadline, or within 2 h of another N-03 for the same event and recipient, is skipped. With the match defaults (deadline 24 h before kickoff), only the deadline − 1 h reminder is sent. |
| BR-NOTIF-14 | **Weekly ritual merge** (R2): when a player's N-11 is due within 2 h before their N-02, N-11 is held and N-02 carries the check-in call to action instead. If the player has N-02 turned off, or gets no N-02 that week, N-11 is sent on its own. |

## 5. User stories

### NOTIF-01 · Register devices for push
**Release:** R1 · **Priority:** Must · **Size:** M · **Platforms:** Mobile, Server

As a user, I want my phone to receive notifications for my clubs so that I don't miss events.

**Acceptance criteria**
- The app registers and refreshes its push token on start, linked to the user and the device (platform, app version, locale). It supports several devices per user (BR-NOTIF-12).
- Permission priming follows BR-NOTIF-10.

### NOTIF-02 · Notification delivery pipeline
**Release:** R1 · **Priority:** Must · **Size:** L · **Platforms:** Server

As the platform, we need reliable scheduling and delivery so that reminders arrive on time and exactly once.

**Acceptance criteria**
- Scheduled notifications are persisted and processed by background workers, applying BR-NOTIF-01 to BR-NOTIF-05.
- p95 delivery hand-off to the push provider is within 60 s of the scheduled time.
- Failures are retried with exponential backoff (up to 3 attempts). Delivery outcomes are recorded per notification.
- Operational metrics are emitted: queue lag, sent/failed counts and invalid tokens ([NFR](../tech/05-non-functional-requirements.md)).

### NOTIF-03 · In-app inbox
**Release:** R1 · **Priority:** Must · **Size:** M · **Platforms:** Mobile, Web

As a user, I want to see past notifications so that I can catch up on what I missed.

**Acceptance criteria**
- A bell icon with an unread count opens a list of notifications (90 days), newest first, grouped by day. Tapping one deep-links (BR-NOTIF-07) and marks it read. There is a "Marcar todo como leído" action.

### NOTIF-04 · Notification preferences
**Release:** R1 · **Priority:** Should · **Size:** S · **Platforms:** Mobile, Web

As a user, I want to choose which reminders I get so that the app doesn't bother me.

**Acceptance criteria**
- Settings → Notificaciones shows the groups from BR-NOTIF-11 per club, with mandatory types listed and locked, and a link to system notification settings.

### NOTIF-05 · Actionable RSVP notifications
**Release:** R1 · **Priority:** Must · **Size:** M · **Platforms:** Mobile

(See [F03](F03-events-and-attendance.md) EVT-09 for the user-facing acceptance criteria.) Technical acceptance: notification categories with Voy / No voy actions on iOS and Android, a background handler that submits authenticated RSVPs with an idempotency key, and a retry when the app next opens.

### NOTIF-06 · Email fallback for critical changes
**Release:** R1 · **Priority:** Should · **Size:** S · **Platforms:** Server

As a player without push enabled, I want an email if an event I'm going to is cancelled at short notice.

**Acceptance criteria**
- N-06 is sent by email to invitees with RSVP `going` or `pending` who have no valid push token, when the event starts within 24 h.

### NOTIF-07 · Category announcements
**Release:** R3 · **Priority:** Could · **Size:** M · **Platforms:** Mobile, Web

As a DT, I want to send a short one-way announcement to my category ("Mañana se entrena con ropa oscura") so that important info doesn't get lost in WhatsApp.

**Acceptance criteria**
- Staff write a text (≤ 280 characters) for one or more of their categories. It is delivered as push and inbox and counts toward the daily cap. Replies are not supported: this is a deliberate non-goal, the product does not compete with WhatsApp chat.

## 6. Telemetry

`push_permission_prompted {result}`, `notification_sent {type, channel, delayed_by_quiet_hours, capped}`, `notification_opened {type, latency_min}`, `notification_action {type, action}`, `notification_prefs_changed {group, enabled}`. Delivery health is monitored operationally (NOTIF-02), not as product events.

## 7. Open questions

- **OQ-20** WhatsApp Business notifications: when, and with what budget?
