---
name: authorization-policy
description: Add or change who can do what - implement a permission-matrix action in the central policy module, wire it to an endpoint, shape responses by role, access-log health data, and write the role and cross-tenant test matrix. Use for any new action, role rule, permission change or health-data read path.
argument-hint: <action, e.g. events.rsvp.proxy> [story ID]
---

# Authorization policy

Specs: `docs/product/02-personas-and-roles.md` § 3–5 (scopes, permission matrix, role rules), `docs/tech/01-architecture-overview.md` § 6.2, NFR-SEC-02, NFR-SEC-03, BR-WELL-16.

Changes here need **2 approvals, one from the tech lead**. Say so in the PR description.

## 1. Find the rule

1. Find the row in the permission matrix (§ 4) for the action, and every 🔸 conditional cell. Read the footnotes and the role rules (§ 5).
2. Find the business rules in the feature spec that add conditions (category scope, deadlines, "only the creator", current vs. past memberships).
3. If the matrix doesn't cover the action, or conflicts with a feature spec, **stop and ask**. Don't guess a permission.

## 2. Name the action

`<module>.<resource>.<verb>`: `events.rsvp.own`, `events.rsvp.proxy`, `events.attendance.record`, `clubs.members.move`, `wellness.history.read`. One action per distinct permission in the matrix.

## 3. Implement the policy

In `modules/<context>/<context>.policy.ts`, as a pure function of the actor's **current** memberships and the resource's attributes. No database access inside the policy; the guard loads what it needs.

```ts
export const eventsPolicies = {
  'events.rsvp.own': (actor: ActorContext, event: EventScope) =>
    event.inviteeMembershipIds.includes(actor.clubMembershipId),
  'events.rsvp.proxy': (actor: ActorContext, event: EventScope) =>
    actor.isAdmin || actor.isStaffOfAny(event.categoryIds),
} satisfies PolicyMap;
```

- The actor context is loaded from current memberships on every request, never from token claims alone (BR-ROLE-08).
- Club Admin alone doesn't grant staff permissions over health data (BR-ROLE-10, privacy § 1).
- Owner-only actions (transfer, delete club) check `isOwner`, not `isAdmin`.

## 4. Wire it

- The controller declares the action with `@Can('<action>')`.
- Cross-club resources return **404**. Collections filter by visibility instead of returning 403.
- **Response shaping**: if a role may see the resource but not every field, the serializer removes the fields (e.g. `rsvpReason`, `rsvpNote` per BR-EVT-12). Never rely on the client to hide them.
- **Health data**: reads go through the `wellness` (or `content`) module's access-logged method, which writes `data_access_log` with actor, subject, resource and context (BR-WELL-16).

## 5. Test the matrix (mandatory)

One table-driven integration test per action, covering every relevant actor. Take the expected results from the matrix, not from the implementation.

```ts
describe('PUT …/invitees/:inviteeId/rsvp: events.rsvp.proxy (EVT-12)', () => {
  it.each([
    ['DT of the event category', 'dtOfCategory', 200],
    ['Coach of the event category', 'coachOfCategory', 200],
    ['Club Admin without a staff role', 'adminOnly', 200],
    ['DT of another category', 'dtOfOtherCategory', 403],
    ['Player of the category', 'player', 403],
    ['Member of another club', 'otherClubMember', 404],
    ['Unauthenticated', 'anonymous', 401],
  ])('%s → %i', async (_label, actorKey, expectedStatus) => {
    const res = await as(actors[actorKey]).put(path).send(body);
    expect(res.status).toBe(expectedStatus);
  });
});
```

The rows above follow matrix § 4.2 for proxy RSVP; always re-read the matrix for the action at hand. Also test:
- role changes take effect on the next request (revoke a role, retry, get denied);
- an ended category membership loses access to that category's health data;
- shaped responses omit restricted fields for each role;
- health-data reads write exactly one access-log row.

## 6. Docs

If the implementation clarifies a 🔸 cell or a role rule, update the roles doc in the same PR.
