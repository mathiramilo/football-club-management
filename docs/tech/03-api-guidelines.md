# API Guidelines & Endpoint Inventory

> Status: **Proposed v0.1** · Last updated: 2026-10-25
> Contract-first: request and response schemas live in `packages/contracts` (Zod) and generate the OpenAPI document and the typed client used by web and mobile.

## 1. Conventions

| Topic | Rule |
|---|---|
| Style | REST over HTTPS, JSON bodies, `camelCase` fields, plural resource nouns. |
| Base path | `/v1`. Breaking changes require `/v2` or additive evolution. Old mobile app versions stay in the wild for months, so **only additive changes** are allowed in `v1`. |
| Tenancy | Club-scoped resources live under `/v1/clubs/{clubId}/…`. The server always re-checks that the caller belongs to that club (never trust the path alone). |
| Auth | `Authorization: Bearer <session token>` (mobile) or a secure httpOnly cookie (web), both issued by Better Auth (ADR-007). Public endpoints live under `/v1/public/…` and only return non-personal data. The one exception is `GET /v1/app-config`, which every app calls at launch (§ 3). |
| Client headers | `X-App-Version` (a semantic version, `1.3.0`), `X-Platform` (`ios`, `android`, `web`), `Accept-Language`. The generated client sends them on every request. The API keeps the first two in the request context and drops a value that doesn't parse rather than rejecting the request. A version below its platform's minimum gets `426` `APP_UPDATE_REQUIRED` on every route except `GET /v1/app-config`, which tells the app where to update ([Architecture § 6.11](01-architecture-overview.md#611-app-versions-and-configuration)). |
| Idempotency | Every mutating request from mobile carries `Idempotency-Key` (UUID). The server stores results for 24 h and replays them on retries ([§ 1.3](#13-idempotency)). **Required** for RSVP, roll call, wellness check-ins and routine logs. |
| Concurrency | Documents with a `version` (session plans, events) use `If-Match: <version>`; a mismatch returns `409 Conflict` with the current version. |
| Time | ISO 8601 with offset for instants (`2026-10-14T20:00:00-03:00`); `YYYY-MM-DD` for local dates. Responses include the club `timezone` where relevant. |
| Pagination | Cursor-based: `?limit=50&cursor=…` → `{ items, nextCursor }`. Default limit 50, maximum 200. |
| Filtering and sorting | Explicit query parameters (`?categoryId=…&from=…&to=…&sort=-startsAt`). No generic query language. |
| Errors | `application/problem+json` (RFC 9457) with `type`, `title`, `status`, `detail`, `code` (stable, machine-readable, e.g. `RSVP_LOCKED`) and `errors[]` for validation. Clients map `code` to localized messages. Details in [§ 1.1](#11-errors). |
| Rate limits | Per user and IP; `429` with `Retry-After`. Stricter limits on auth, invites, nudges and AI ([NFR-SEC-05](05-non-functional-requirements.md)). |
| Uploads | Never through the API. `POST …/uploads` returns a presigned URL and constraints; the client uploads directly and then confirms. |
| Streaming | AI chat and generation progress use **Server-Sent Events**. |
| Realtime | None in R1. Clients refetch on focus, on pull-to-refresh and on relevant push receipt. |
| Webhooks (inbound) | `/v1/webhooks/{provider}` with signature verification (video provider, email provider). |
| Health | `GET /health` answers `{ "status": "ok" }` while the process is up (NFR-OBS-04). `GET /health/ready` answers the same when the database responds within 2 s, and 503 when it doesn't (the cause is logged) or while the process drains: after SIGTERM the API keeps serving for `SHUTDOWN_DRAIN_MS` with readiness at 503, so the host stops routing traffic before the server closes. TECH-02 sets the drain to match the host's probe interval. Both sit outside `/v1` and outside the OpenAPI document, because they aren't part of the client contract. |

### 1.1 Errors

- Every code is listed once, with its HTTP status and an English `title`, in the catalog in `packages/contracts`, and has Spanish copy at `errors.<CODE>` in `packages/i18n`.
- `type` is the code as a relative URI, `/problems/<code-in-kebab-case>` (`/problems/rsvp-locked`). It becomes absolute once the product domain is chosen (OQ-03). Clients key on `code`, never on `type` or `title`.
- `detail` appears only when the code that raised the error wrote one for this case. It never echoes request data or internal messages.
- Validation failures answer `400` `VALIDATION_FAILED`, with one `errors[]` item per problem: `in` (`body`, `query` or `path`), `pointer` (a JSON Pointer into that part, `""` for a whole path or query value), `code` and an English `detail`. `code` is the schema's own code when a refinement names one (`REASON_REQUIRED`), otherwise Zod's issue code (`invalid_type`, `too_small`…).
- Errors without a code of their own get a generic one by status: `BAD_REQUEST` (also for malformed JSON), `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND` (also for unknown routes and records), `CONFLICT` (also for unique violations), `PAYLOAD_TOO_LARGE`, `RATE_LIMITED`, `SERVICE_UNAVAILABLE` and `INTERNAL_ERROR`. An unexpected error answers `500` `INTERNAL_ERROR`, and the log keeps only its name and stack frames.

### 1.2 OpenAPI document

- The API builds the document from the same Zod schemas it validates with (`@nestjs/swagger`, ADR-004). `pnpm codegen` writes it to `packages/api-client/openapi.json` without a database and regenerates the client from it. Both are committed, and CI fails when either is stale.
- **Operation IDs** are `<controller><Method>` (`EventsController.list` → `eventsList`). They name the generated functions and hooks, so renaming a controller method renames them. Each module's controllers share one `@ApiTags`, which becomes a folder of the client.
- **Schemas**: request and response schemas that clients name get `.meta({ id: 'PascalCaseName' })`, which makes them components. A handler declares its response with `@ResponseSchema(schema, { status })`: the same schema documents the response and strips undeclared fields before it is sent. Query parameters are one object schema (`@Query({ schema })`); a single `@Query('name', { schema })` is always documented as required.
- **Growing enums**: a response enum that will gain values is an `extensibleEnum([...])` from `packages/contracts`. The document lists its values under `x-extensible-enum` instead of `enum`, so adding one isn't breaking and generated clients type it as a string. Error `code` is one.
- **Security**: every operation accepts the bearer token or the session cookie, except `@Public()` ones, which declare no security.
- **Errors**: every operation documents a `default` response, `application/problem+json` with the `ProblemDetails` schema.
- **Breaking changes**: `pnpm contract:check` runs `oasdiff breaking` between the document on `main` and yours, and fails on any error-level change (NFR-MAINT-03). CI runs it on every pull request.

### 1.3 Idempotency

- It applies to `POST`, `PUT`, `PATCH` and `DELETE` from a signed-in user that carry `Idempotency-Key`. Keys belong to the user, so two users can send the same key. Routes that require a key (`@RequiresIdempotencyKey()`) answer `400` `IDEMPOTENCY_KEY_REQUIRED` without one, and any route does for a key that isn't a UUID.
- The first request runs. Its response is stored when its status is below 500, which includes business errors such as `RSVP_LOCKED`. After a 5xx the key is released, so a retry runs again.
- A retry with the same key and the same request (method, URL and body) gets the stored status and body, with `Idempotent-Replayed: true`.
- The same key with a different request answers `422` `IDEMPOTENCY_KEY_REUSED`.
- While the first request runs, a retry answers `409` `IDEMPOTENCY_REQUEST_IN_PROGRESS`, and the client tries again later. A request still unfinished after 60 s was cut off (a crash or a deploy), and the next retry runs it again.
- A key lasts 24 hours from its request. After that it counts as new.
- The handler's writes and the stored response are separate transactions, so a crash between them, or a retry that runs a cut-off request again, can run the handler twice. So a handler behind a required key must be safe to run twice: RSVP and roll call set a state, and a write that adds a row needs a unique constraint the second run hits.

## 2. Authorization model in the API

- Each handler declares the action it performs (e.g. `events.rsvp.proxy`), or that it is public. The policy module evaluates it against the [permission matrix](../product/02-personas-and-roles.md#4-permission-matrix), from the caller's memberships as they are in the database at that moment. The API doesn't start if a route declares neither.
- Checks answer in a fixed order: an app version below its platform's minimum → `426`; no valid session → `401`; a club the caller isn't an active member of (including a malformed, unknown or deleted club), or a resource that isn't in that club → `404`; an action the caller's roles don't allow → `403`.
- Collection endpoints filter by visibility rather than returning `403`. For example, a player listing events gets only the events they are invited to.
- Responses are **shaped by role**. For example, `event_invitees` returns `rsvpReason` and `rsvpNote` only to staff and to the invitee themselves (BR-EVT-12). Shaping is implemented in serializers per role, never in clients.
- Requests for a resource in another club return `404`, not `403`, so that its existence is not revealed.

## 3. Endpoint inventory (initial)

Release tags indicate when each endpoint is first needed.

### Auth and me (R1)

Better Auth serves the `/v1/auth/*` routes with its own paths and error shape, `{ code, message }` (ADR-007). They aren't problem+json and aren't in the OpenAPI document: clients call them through the Better Auth client, and the generated client covers everything else (TECH-06). The error codes clients localize from these routes are listed in `packages/contracts` (`authErrorCode`).

Code requests answer `429` in two cases (BR-AUTH-03, NFR-SEC-05):
- the per-email limit (60 s between codes, 5 an hour) returns `code` `CODE_RESEND_TOO_SOON` or `CODE_RATE_LIMITED`, with `Retry-After`;
- Better Auth's per-IP limit (30 an hour) returns no `code`, and its wait in `X-Retry-After`.

| Method | Path | Purpose |
|---|---|---|
| POST | `/v1/auth/email-otp/send-verification-otp` | Send an email code (AUTH-03). |
| POST | `/v1/auth/sign-in/email-otp` | Verify the code and start a session. |
| POST | `/v1/auth/sign-in/social` | Exchange a Google or Apple ID token for a session (AUTH-01, AUTH-02). |
| GET | `/v1/auth/get-session` | The current session and user. |
| POST | `/v1/auth/sign-out` | Sign out this device (AUTH-12). |
| POST | `/v1/auth/revoke-sessions` | Sign out of all devices (AUTH-12). |
| GET / PATCH | `/v1/me` | Profile (AUTH-05). |
| DELETE | `/v1/me` | Request account deletion (AUTH-13). |
| POST | `/v1/me/legal-acceptances` | AUTH-04 |
| GET | `/v1/me/clubs` | Memberships with pending-action counts (AUTH-11). |
| GET | `/v1/me/agenda?from&to&clubId?` | Unified agenda (EVT-17). |
| GET | `/v1/me/week` | "Tu semana" (EVT-18). |
| GET | `/v1/me/stats?clubId&categoryId&from&to` | ANL-01 |
| PUT | `/v1/me/devices/{deviceId}` | Register or refresh the push token (NOTIF-01). |
| GET / PUT | `/v1/me/notification-preferences` | NOTIF-04 |
| GET | `/v1/me/notifications?cursor` · POST `/v1/me/notifications/read` | Inbox (NOTIF-03). |
| GET | `/v1/app-config` | Public. Minimum version per platform, whether the calling app must update, and store links (TECH-14). Flags join later ([Architecture § 6.12](01-architecture-overview.md#612-feature-flags)). |

### Invites, joins and claims (R1)
| Method | Path | Purpose |
|---|---|---|
| GET | `/v1/public/invites/{codeOrToken}` | Invite preview: club, category, role (BR-AUTH-09). |
| POST | `/v1/invites/{codeOrToken}/accept` | Join or create a join request. |
| GET | `/v1/public/claims/{token}` · POST `/v1/claims/{token}/accept` | AUTH-09 |

### Clubs and membership (R1)
| Method | Path | Purpose |
|---|---|---|
| POST | `/v1/clubs` | CLUB-01 |
| GET / PATCH / DELETE | `/v1/clubs/{clubId}` | CLUB-02, CLUB-17 |
| GET / POST | `/v1/clubs/{clubId}/categories` | CLUB-03 |
| PATCH | `/v1/clubs/{clubId}/categories/{categoryId}` | Includes `settings` (CLUB-14). |
| POST | `/v1/clubs/{clubId}/categories/{categoryId}/archive` · `/restore` | CLUB-04 |
| GET / POST | `/v1/clubs/{clubId}/categories/{categoryId}/invite-links` · DELETE `…/{linkId}` | CLUB-05 |
| GET | `/v1/clubs/{clubId}/join-requests?status&categoryId` | CLUB-06 |
| POST | `/v1/clubs/{clubId}/join-requests/{id}/approve` · `/reject` · `/v1/clubs/{clubId}/join-requests/approve-bulk` | CLUB-06 |
| GET | `/v1/clubs/{clubId}/members?q&categoryId&role&status&line&cursor` | CLUB-08 |
| POST | `/v1/clubs/{clubId}/members` | Create managed profiles in bulk (CLUB-07). |
| GET / PATCH / DELETE | `/v1/clubs/{clubId}/members/{membershipId}` | Details, player data (AUTH-10), removal (CLUB-11). |
| POST | `/v1/clubs/{clubId}/members/{membershipId}/category-memberships` | CLUB-09 |
| PATCH / DELETE | `/v1/clubs/{clubId}/category-memberships/{id}` | Change role or end membership. |
| POST | `/v1/clubs/{clubId}/members/{membershipId}/move` | `{ fromCategoryId, toCategoryId, mode: move|add, effectiveOn }` (CLUB-10). |
| POST | `/v1/clubs/{clubId}/members/{membershipId}/claim-link` | AUTH-09 |
| POST | `/v1/clubs/{clubId}/members/{membershipId}/merge` | Merge a duplicate (BR-CLUB-10). |
| PUT / DELETE | `/v1/clubs/{clubId}/admins/{membershipId}` | CLUB-12 |
| POST | `/v1/clubs/{clubId}/ownership-transfers` · `/{id}/accept` | CLUB-12 |
| GET / POST / PATCH | `/v1/clubs/{clubId}/venues[/{venueId}]` | CLUB-13 |

### Events and attendance (R1)
| Method | Path | Purpose |
|---|---|---|
| GET | `/v1/clubs/{clubId}/events?from&to&categoryId&type&status` | Staff calendar. |
| POST | `/v1/clubs/{clubId}/events` | One-off event (EVT-01, EVT-05). |
| POST | `/v1/clubs/{clubId}/event-series` · PATCH `…/{seriesId}` (extend) | EVT-02 |
| GET | `/v1/clubs/{clubId}/events/{eventId}` | Details with availability summary (EVT-11). |
| PATCH | `/v1/clubs/{clubId}/events/{eventId}?scope=this|following` | Body includes `requestReconfirm`, `notifyPlayers` (EVT-03). |
| POST | `/v1/clubs/{clubId}/events/{eventId}/cancel` · `/restore` · DELETE | EVT-04, BR-EVT-16 |
| GET | `/v1/clubs/{clubId}/events/{eventId}/invitees` | Role-shaped (BR-EVT-12). |
| POST / DELETE | `/v1/clubs/{clubId}/events/{eventId}/invitees[/{inviteeId}]` | Call-ups and removals (EVT-06). |
| PUT | `/v1/clubs/{clubId}/events/{eventId}/rsvp` | Own RSVP (EVT-08, EVT-09, EVT-10). Requires `Idempotency-Key`. |
| PUT | `/v1/clubs/{clubId}/events/{eventId}/invitees/{inviteeId}/rsvp` | Proxy RSVP (EVT-12). |
| POST | `/v1/me/week/rsvps` | Bulk RSVP (EVT-18). |
| POST | `/v1/clubs/{clubId}/events/{eventId}/nudges` | EVT-13 (rate-limited). |
| PUT | `/v1/clubs/{clubId}/events/{eventId}/attendance` | Batch roll call `{ records: [{ inviteeId, status, justified }], walkIns: [...] }`. Idempotent (EVT-15). |
| GET | `/v1/public/events/{shareToken}` | Public summary for link landing and link previews (EVT-07). |
| GET | `/v1/calendar/{feedToken}.ics` | R2, EVT-19 |

### Analytics (R1)
| Method | Path |
|---|---|
| GET | `/v1/clubs/{clubId}/analytics/categories/{categoryId}/summary?from&to&type&includeCallUps` |
| GET | `/v1/clubs/{clubId}/analytics/categories/{categoryId}/players?…` |
| GET | `/v1/clubs/{clubId}/analytics/categories/{categoryId}/breakdown?by=line|weekday|week` |
| GET | `/v1/clubs/{clubId}/analytics/categories/{categoryId}/response?…` |
| GET | `/v1/clubs/{clubId}/analytics/members/{membershipId}?…` |
| GET | `/v1/clubs/{clubId}/analytics/overview?…` (Club Admins) |
| GET | `/v1/clubs/{clubId}/analytics/categories/{categoryId}/export.csv` (R3) |

### Training (R2)
| Method | Path |
|---|---|
| GET / POST | `/v1/clubs/{clubId}/exercises?q&type&intensity&equipment&players&duration&status&sort&cursor` |
| GET / PATCH | `/v1/clubs/{clubId}/exercises/{exerciseId}` |
| POST | `/v1/clubs/{clubId}/exercises/{exerciseId}/archive` · `/restore` · `/duplicate` |
| POST / DELETE | `/v1/clubs/{clubId}/exercises/{exerciseId}/media[/{mediaId}]` |
| POST | `/v1/clubs/{clubId}/uploads` (presign: `{ purpose, mimeType, sizeBytes }`) |
| GET | `/v1/starter/exercises?…` · POST `/v1/clubs/{clubId}/exercises/copy-from-starter` |
| GET / PUT | `/v1/clubs/{clubId}/events/{eventId}/plan` (`If-Match`) |
| POST | `/v1/clubs/{clubId}/events/{eventId}/plan/publish` · `/unpublish` · `/copy-from` |
| GET / POST / PATCH / DELETE | `/v1/clubs/{clubId}/plan-templates[/{templateId}]` |

### Wellness (R2)
| Method | Path |
|---|---|
| GET / POST / DELETE | `/v1/clubs/{clubId}/wellness/consent` (own) |
| POST | `/v1/clubs/{clubId}/wellness/consent/guardian-requests` |
| GET / POST | `/v1/public/guardian-consent/{token}` (view, accept, revoke) |
| POST | `/v1/clubs/{clubId}/wellness/checkins` (Idempotency-Key) · PUT `/v1/clubs/{clubId}/wellness/checkins/today` |
| GET | `/v1/clubs/{clubId}/wellness/checkins/me?from&to` |
| DELETE | `/v1/clubs/{clubId}/wellness/checkins/me` (delete history, BR-WELL-14) |
| GET | `/v1/clubs/{clubId}/categories/{categoryId}/wellness/board` (access-logged) |
| GET | `/v1/clubs/{clubId}/members/{membershipId}/wellness?from&to` (access-logged) |
| POST | `/v1/clubs/{clubId}/categories/{categoryId}/wellness/requests` (R3, WELL-13) |

### Content (R3)
| Method | Path |
|---|---|
| GET / POST / PATCH | `/v1/clubs/{clubId}/routines[/{id}]` · `/nutrition-plans[/{id}]` |
| POST | `…/{id}/archive` · `…/{id}/duplicate` |
| GET / POST / DELETE | `/v1/clubs/{clubId}/assignments[/{id}]` |
| GET | `/v1/me/routines?clubId` · `/v1/me/nutrition-plans?clubId` |
| POST / PATCH / DELETE | `/v1/clubs/{clubId}/routines/{id}/logs[/{logId}]` |
| GET | `/v1/clubs/{clubId}/routines/{id}/adherence` |

### AI (R3)
| Method | Path |
|---|---|
| POST | `/v1/clubs/{clubId}/ai/plan-generations` → `202 { id }` |
| GET | `/v1/clubs/{clubId}/ai/plan-generations/{id}` · `/events` (SSE progress) |
| POST | `/v1/clubs/{clubId}/ai/plan-generations/{id}/refine` · `/accept` |
| GET / POST | `/v1/clubs/{clubId}/ai/conversations` |
| GET / PATCH / DELETE | `/v1/clubs/{clubId}/ai/conversations/{id}` |
| POST | `/v1/clubs/{clubId}/ai/conversations/{id}/messages` (SSE stream) |
| POST | `/v1/clubs/{clubId}/ai/feedback` |
| GET | `/v1/clubs/{clubId}/ai/usage` (Club Admins) |

## 4. Example: own RSVP

```http
PUT /v1/clubs/8f…/events/01J…/rsvp
Authorization: Bearer …
Idempotency-Key: 6a7c…
X-App-Version: 1.3.0
X-Platform: android

{ "status": "not_going", "reason": "work_study", "note": "Salgo tarde del laburo" }
```

```http
200 OK
{
  "eventId": "01J…",
  "status": "not_going",
  "reason": "work_study",
  "arrivingLate": false,
  "isLateChange": false,
  "respondedAt": "2026-10-13T15:02:11-03:00"
}
```

Error example (event locked):

```http
409 Conflict
Content-Type: application/problem+json

{ "type": "/problems/rsvp-locked", "title": "RSVP closed", "status": 409,
  "code": "RSVP_LOCKED", "detail": "Confirmations closed at 2026-10-14T18:00:00-03:00" }
```
