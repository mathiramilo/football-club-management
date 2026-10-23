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
model CategoryMembership {
  id               String    @id @default(uuid(7)) @db.Uuid
  clubId           String    @map("club_id") @db.Uuid
  categoryId       String    @map("category_id") @db.Uuid
  clubMembershipId String    @map("club_membership_id") @db.Uuid
  staffRole        String?   @map("staff_role")
  isPlayer         Boolean   @default(false) @map("is_player")
  startsOn         DateTime  @map("starts_on") @db.Date
  endsOn           DateTime? @map("ends_on") @db.Date
  createdAt        DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt        DateTime  @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)

  club           Club           @relation(fields: [clubId], references: [id])
  category       Category       @relation(fields: [categoryId, clubId], references: [id, clubId])
  clubMembership ClubMembership @relation(fields: [clubMembershipId, clubId], references: [id, clubId])

  @@unique([categoryId, clubMembershipId], map: "category_memberships_one_open_per_person", where: { endsOn: null })
  @@index([categoryId, endsOn])
  @@index([clubMembershipId])
  @@index([clubId])
  @@map("category_memberships")
}
```

Checklist: `club_id` on tenant tables · UUID v7 id · `timestamptz` timestamps · `@default(now()) @updatedAt` so raw SQL inserts work · `@map` / `@@map` snake_case · enum as `String` · indexes for the queries the story needs · hashed tokens · `version` on collaboratively edited documents.

- **Tenant consistency**: a club-owned parent declares `@@unique([id, clubId])`, and each child references it with `@relation(fields: [parentId, clubId], references: [id, clubId])`, so a child can't point at another club's row. This works for nullable parent columns too.
- **Partial indexes** live in the schema (`where:` on `@@unique` / `@@index`, `partialIndexes` preview feature), so drift checks see them.

## 3. Generate, then add what Prisma can't express

1. Create the migration without applying it: `prisma migrate dev --create-only --name <verb_noun>` (e.g. `add_event_invitees`), run in `apps/api`.
2. Append the SQL the schema can't express, under a `-- Hand-written` heading:

```sql
ALTER TABLE event_invitees
  ADD CONSTRAINT event_invitees_rsvp_status_check
    CHECK (rsvp_status IN ('pending', 'going', 'not_going')),
  ADD CONSTRAINT event_invitees_not_going_requires_reason_check
    CHECK (rsvp_status <> 'not_going' OR rsvp_reason IS NOT NULL);

CREATE UNIQUE INDEX categories_club_id_name_active_key
  ON categories (club_id, lower(immutable_unaccent(name)))
  WHERE archived_at IS NULL;
```

   Prisma's drift check ignores CHECK constraints and expression indexes, so they stay. `unaccent()` isn't immutable: use the `immutable_unaccent()` wrapper in indexes and generated columns. Also: generated `tsvector` columns (Spanish config + `unaccent`) and extensions.
3. Apply it with `pnpm --filter ./apps/api db:migrate` (Prisma 7's `migrate dev` no longer regenerates the client; the script does), then run it again and confirm it reports **no drift**. The `Prisma migrations` integration test repeats this check in CI. If Prisma tries to drop a hand-written object, the pinned Prisma version can express it in the schema: use the schema instead.

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
