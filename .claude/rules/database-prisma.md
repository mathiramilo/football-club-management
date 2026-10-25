---
paths:
  - "apps/api/prisma/**"
  - "apps/api/src/**/*.repository.ts"
---

# Database: PostgreSQL + Prisma

Specs: `docs/tech/02-data-model.md`, ADR-005, ADR-013. See the `prisma-migration` skill for schema changes.

## Schema conventions

- Primary keys: `id`, UUID v7 (`@default(uuid(7)) @db.Uuid`).
- **Every club-owned table has `club_id`** (FK, indexed, leading most composite indexes). Starter-library rows use `club_id = NULL` with `source = 'starter'`.
- Tables `snake_case` plural via `@@map`; columns `snake_case` via `@map`; Prisma models and fields stay PascalCase / camelCase.
- The one exception to both: `app_config` holds one row per platform, keyed by `platform` (data model § 3.9).
- `created_at` and `updated_at` as `timestamptz` on every table. `date` columns only for calendar days in the club time zone (e.g. `wellness_checkins.local_date`).
- Enums are `text` columns with `CHECK` constraints, not native Postgres enums. Values come from the glossary.
- Soft delete: `archived_at` for user-facing archiving; `deleted_at` + `purge_at` for scheduled hard deletes done by purge jobs.
- `created_by` / `updated_by` on mutable business tables. A `version` integer on collaboratively edited documents (`events`, `session_plans`).
- Access-granting tokens are stored as hashes (`token_hash`), never in plain text.
- Extensions in use: `btree_gist`, `citext`, `unaccent`, `pg_trgm`.
- Every club-owned table gets the `forbid_club_id_change` trigger in its migration: a row never moves to another club.
- Enforce invariants in the database where possible (data model § 4): partial unique indexes, check constraints, composite FKs for tenant consistency. Partial indexes and composite FKs go in the schema (`partialIndexes` preview; parent `@@unique([id, clubId])`, child `references: [id, clubId]`); CHECK constraints and expression indexes go in the migration SQL.

## Migrations

- Forward-only, reviewed, and **backward-compatible with the previous API version** that is still running during a deploy (expand → migrate → contract, NFR-MAINT-05). Never rename or drop a column in the same release that stops using it.
- Large backfills run as jobs or scripts, not inside the migration.
- Never edit a migration that has been merged; add a new one.

## Queries

- Repositories are the only code that uses the Prisma client, and every method takes the club context first and queries through `this.prisma.forClub(club)`. That client ANDs the club into every filter on `clubs` and on club-owned tables, so a row of another club is never found, counted, updated or deleted, and it throws `ClubScopeViolation` when a write names another club. A new club-owned table goes into `CLUB_OWNED_MODELS` (`core/database/club-scope.ts`); a test fails until it does.
- On club-scoped relations write the scalar foreign keys (`venueId`, `rsvpSetBy`), never relation `connect` / `disconnect`: `connect` rewrites `club_id` (the trigger rejects it) and `disconnect` tries to null `club_id`.
- The scoped client covers Prisma model queries only. Raw SQL filters by `club_id` itself, and models without `club_id` (users, sessions) pass through unscoped, together with the club rows reached through their relations: never include club data from them.
- Interactive transactions use only `tx`, stay short, and contain no provider calls. The outbox row is written with the same `tx`.
- Map `P2002` (unique), `P2003` (foreign key), `P2039` (check) and `P2025` (not found) to problem+json codes at the service boundary. A Prisma error's `meta` carries Postgres's `detail`, which for a CHECK violation is the whole failing row: never log, report or return `meta`.
- `updateMany` doesn't set `@updatedAt`: set `updatedAt` explicitly. Use `createManyAndReturn` / `updateManyAndReturn` when you need the rows.
- Index every foreign key. In composite indexes put `club_id` first, then equality columns, then range or sort columns; use partial indexes for status and soft-delete filters. Check new heavy queries with `EXPLAIN (ANALYZE, BUFFERS)` on realistic seed data.
- Reference skills: `prisma-client-api` (client API) and `postgres-best-practices` (indexes, locking, query design).
- Heavy analytics queries use the `$queryRaw` tagged template (it parameterizes) with a declared row type, and an integration test that checks the rows (ADR-013). TypedSQL waits until it leaves preview and can generate without a database. Never `$queryRawUnsafe` or `$executeRawUnsafe` with interpolated input.
- Writes that set a few distinct values across many rows (roll call) use `updateMany` grouped by value inside one transaction, not one update per row (ADR-013).
- Select only the columns the caller needs; never return `[H]` columns to code paths that don't need them.
- Attendance metrics are computed on read in R1 (BR-ANL-05). Add pre-aggregation (TECH-20) only if NFR-PERF-01 is missed.
- Health-data tables (`wellness_*`) are read only through the access-logged methods of the `wellness` module.
