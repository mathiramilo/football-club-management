---
name: api-endpoint
description: Add or change a REST endpoint in the NestJS API, contract-first, from Zod schema in packages/contracts through controller, service, repository, policy, serializer, tests and client regeneration. Use when adding a route, changing a request or response shape, or adding an error code.
argument-hint: <METHOD> <path> [story ID]
---

# Add or change an API endpoint

Specs: `docs/tech/03-api-guidelines.md` (conventions and inventory), `docs/tech/02-data-model.md`, the feature spec of the story.

The decorator and helper names below (`@Can`, `@Club`, `@CurrentActor`, `@RequiresIdempotencyKey`, `DomainError`, test helpers) are the conventions TECH-05 and TECH-06 set up. If the code already uses different names, follow the code.

## 1. Check the inventory

Find the endpoint in `docs/tech/03-api-guidelines.md` § 3. If it isn't there, or its shape differs, the spec changes in the same PR. Confirm the change is **additive** for `v1` (see the `api-contracts` rule).

## 2. Contract

In `packages/contracts/src/<context>/<resource>.ts`, define request body, query, params and response schemas, reusing shared enums.

```ts
import { z } from 'zod';
import { absenceReason, rsvpStatus } from '../enums';

export const updateOwnRsvpBody = z
  .object({
    status: rsvpStatus.exclude(['pending']),
    reason: absenceReason.optional(),
    note: z.string().optional(),
    arrivingLate: z.boolean().optional(),
  })
  .refine((body) => body.status !== 'not_going' || body.reason !== undefined, {
    path: ['reason'],
    message: 'REASON_REQUIRED',
  });

export const rsvpResponse = z.object({
  eventId: z.string().uuid(),
  status: rsvpStatus,
  reason: absenceReason.nullable(),
  arrivingLate: z.boolean(),
  isLateChange: z.boolean(),
  respondedAt: z.string().datetime({ offset: true }),
});

export type UpdateOwnRsvpBody = z.infer<typeof updateOwnRsvpBody>;
export type RsvpResponse = z.infer<typeof rsvpResponse>;
```

Add any new error code to the catalog in `packages/contracts` with its HTTP status, and its Spanish message in `packages/i18n` (`errors.<CODE>`).

## 3. Repository and service

- Repository method: club context first, selects only needed columns, no business rules.
- Service: loads state, calls `packages/domain` for pure rules, persists, writes outbox events in the same transaction for side effects, throws `DomainError('<CODE>')` for business failures.

## 4. Policy

Name the action `<module>.<resource>.<verb>` (e.g. `events.rsvp.own`, `events.rsvp.proxy`) and implement it with the `authorization-policy` skill.

## 5. Controller and serializer

```ts
export class UpdateOwnRsvpDto extends createZodDto(updateOwnRsvpBody) {}

@Controller('clubs/:clubId/events/:eventId')
export class RsvpController {
  constructor(private readonly rsvps: RsvpService) {}

  @Put('rsvp')
  @Can('events.rsvp.own')
  @RequiresIdempotencyKey()
  async updateOwn(
    @Club() club: ClubContext,
    @CurrentActor() actor: Actor,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() body: UpdateOwnRsvpDto,
  ): Promise<RsvpResponse> {
    const invitee = await this.rsvps.updateOwn(club, actor, eventId, body);
    return serializeRsvp(invitee, actor);
  }
}
```

- The serializer shapes the response by role (e.g. reasons and notes only for staff and the invitee, BR-EVT-12).
- Add `@RequiresIdempotencyKey()` for RSVP, bulk RSVP, roll call, wellness check-ins and routine logs, and for any other mutation the mobile app may queue offline.
- Versioned documents (`events`, `session_plans`) read `If-Match` and return 409 with the current version on mismatch.
- Collections are cursor-paginated (`{ items, nextCursor }`, default 50, max 200) and filtered by visibility.

## 6. Tests (mandatory)

In `apps/api/test/<context>/<resource>.int.spec.ts`, against Testcontainers Postgres. At minimum:

```ts
describe('PUT /v1/clubs/:clubId/events/:eventId/rsvp (EVT-08)', () => {
  it('records going for an invited player');
  it('requires a reason for not_going');
  it('flags a change after the deadline as late (BR-EVT-09)');
  it('returns 409 RSVP_LOCKED after the deadline on a locked event (BR-EVT-09)');
  it('replays the stored response for a repeated Idempotency-Key and writes once');
  it('returns 404 to a member of another club');
  it('denies roles the permission matrix denies');
});
```

Add one test per acceptance criterion and per business rule the endpoint enforces. Assert problem+json `code`, not message text.

## 7. Regenerate and verify

1. Regenerate the OpenAPI document and the Orval client (`packages/api-client`). Never edit generated files.
2. Run the OpenAPI breaking-change check, lint, typecheck and the API tests.
3. Update `docs/tech/03-api-guidelines.md` § 3 if the endpoint is new or its shape changed.
