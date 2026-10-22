---
name: prisma-migration
description: Change the PostgreSQL schema with Prisma safely - new tables or columns, indexes, constraints, renames and drops using expand/contract, plus hand-written SQL for check constraints, partial unique indexes and generated columns. Use for any edit to apps/api/prisma/schema.prisma or a new migration.
argument-hint: <change description> [story ID]
---

# Database migration (Prisma)

Specs: `docs/tech/02-data-model.md` (entities, conventions, invariants), ADR-005, ADR-013, NFR-MAINT-05. Conventions are in the `database-prisma` rule.

## 1. Design

1. Find the entity in the data model. If the change isn't there, update the data model in the same PR.
2. Classify the change:
   - **Additive** (new table, nullable column, column with a default, new index): one migration.
   - **Breaking** (rename, drop, type change, new NOT NULL without a default, tighter constraint): use **expand → migrate → contract** across releases. The previous API version keeps running against the new schema during a deploy, so it must still work.

| Step | Release N | Release N+1 | Release N+2 |
|---|---|---|---|
| Rename `a` → `b` | Add `b`, write both, backfill | Read `b`, stop writing `a` | Drop `a` |
| New required column | Add nullable, write it, backfill | Add NOT NULL | — |

3. Large backfills (`event_invitees`, `rsvp_changes`, `notifications`) run as a job or script in batches, not inside the migration.

## 2. Edit the schema

```prisma
model EventInvitee {
  id               String    @id @default(uuid(7)) @db.Uuid
  clubId           String    @map("club_id") @db.Uuid
  eventId          String    @map("event_id") @db.Uuid
  clubMembershipId String    @map("club_membership_id") @db.Uuid
  rsvpStatus       String    @default("pending") @map("rsvp_status")
  rsvpReason       String?   @map("rsvp_reason")
  removedAt        DateTime? @map("removed_at") @db.Timestamptz(6)
  createdAt        DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt        DateTime  @updatedAt @map("updated_at") @db.Timestamptz(6)

  club           Club           @relation(fields: [clubId], references: [id])
  event          Event          @relation(fields: [eventId], references: [id])
  clubMembership ClubMembership @relation(fields: [clubMembershipId], references: [id])

  @@unique([eventId, clubMembershipId])
  @@index([clubMembershipId, eventId])
  @@index([eventId, rsvpStatus])
  @@map("event_invitees")
}
```

Checklist: `club_id` on tenant tables · UUID v7 id · `timestamptz` timestamps · `@map` / `@@map` snake_case · enum as `String` · indexes for the queries the story needs · hashed tokens · `version` on collaboratively edited documents.

## 3. Generate, then add what Prisma can't express

1. Create the migration without applying it: `prisma migrate dev --create-only --name <verb_noun>` (e.g. `add_event_invitees`), run in `apps/api`.
2. Append the SQL the schema can't express:

```sql
ALTER TABLE event_invitees
  ADD CONSTRAINT event_invitees_rsvp_status_check
  CHECK (rsvp_status IN ('pending', 'going', 'not_going'));

ALTER TABLE event_invitees
  ADD CONSTRAINT event_invitees_not_going_requires_reason
  CHECK (rsvp_status <> 'not_going' OR rsvp_reason IS NOT NULL);

CREATE UNIQUE INDEX category_memberships_one_open_per_person
  ON category_memberships (category_id, club_membership_id)
  WHERE ends_on IS NULL;
```

   Also: generated `tsvector` columns (Spanish config + `unaccent`), extensions, composite FKs for tenant consistency.
3. Apply it with `prisma migrate dev`, then run it again and confirm it reports **no drift**. If Prisma tries to drop a hand-written object, the pinned Prisma version can express it in the schema: use the schema instead.

## 4. Review the SQL

- Read the generated SQL line by line. Look for unintended drops, table rewrites and long locks on large tables.
- Indexes: every foreign key indexed; `club_id` first in composite indexes, then equality columns, then range or sort columns; partial indexes for status and soft-delete filters. See the `postgres-best-practices` skill.
- Large tables (`event_invitees`, `rsvp_changes`, `notifications`, `data_access_log`):
  - add constraints as `NOT VALID`, then `VALIDATE CONSTRAINT` in a later migration;
  - `CREATE INDEX CONCURRENTLY` can't run inside a transaction block: give it its own migration and confirm how the pinned Prisma version applies migration files;
  - set a short `lock_timeout` so the migration fails fast instead of queueing behind traffic.
- Never edit a merged migration (its checksum is recorded). Fix forward with a new one.

## 4b. Command safety

- `prisma migrate dev` runs locally only. CI and deploys run `prisma migrate deploy`. Use `prisma migrate diff` to check for drift.
- Never run `prisma db push` against a shared database.
- `prisma migrate reset`, `db push --force-reset` and `db push --accept-data-loss` destroy data. Run them only against a database you have confirmed is local, after explaining what will be lost and getting the user's explicit consent for that exact command. Never set Prisma's AI-consent variable with text the user didn't write, and never reuse an earlier approval.

## 5. Follow-through

- Update the synthetic seed generator if the table needs seed data.
- Repository methods for the new table take the club context first.
- Add integration tests that hit the new constraints (e.g. a second open membership is rejected).
- Update `docs/tech/02-data-model.md` if anything differs from it.
