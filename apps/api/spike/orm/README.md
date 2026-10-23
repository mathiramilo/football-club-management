# ORM spike (TECH-03, ADR-013) — not for merge

Question from tech stack § 8: does Prisma hold up on the RSVP and roll call slice and one analytics query, or should we switch to Drizzle?

## Setup

- Prisma 7.10.1 with `@prisma/adapter-pg`, PostgreSQL 18.6 in Docker on an Apple-silicon laptop, warm cache, no network hop.
- Year-1 volume (NFR-SCALE-02) from the seed generator: `db:seed --clubs 200 --months 12 --today 2026-10-23` → 200 clubs, 799 categories, 161,649 events, 3,300,337 invitees, 2,624,469 RSVP changes (13 min), then `VACUUM ANALYZE`.
- Run: `DATABASE_URL=… pnpm exec prisma generate --sql && pnpm exec tsx spike/orm/bench.ts`

## Results (2026-10-23)

| Operation | p50 | p95 | max | Target |
|---|---|---|---|---|
| ANL-03 per-player attendance, busiest category, 12 months · TypedSQL | 5.7 ms | 6.5 ms | 7.1 ms | p95 ≤ 1.5 s |
| same · `$queryRaw` tagged template | 5.8 ms | 6.3 ms | 6.6 ms | p95 ≤ 1.5 s |
| same · query API + TypeScript filtering | 10.2 ms | 18.5 ms | 30.5 ms | p95 ≤ 1.5 s |
| same · TypedSQL, 10 concurrent | 22.5 ms | 48.6 ms | 58.5 ms | p95 ≤ 1.5 s |
| EVT-08 RSVP write (interactive tx: read, update invitee, append history), sequential | 2.6 ms | 3.9 ms | 28.7 ms | p95 ≤ 500 ms |
| same, 20 concurrent | 9.5 ms | 12.4 ms | 14.2 ms | p95 ≤ 500 ms |
| EVT-15 roll call (~25 invitees + event) · one update per invitee | 10 ms | 16.5 ms | 24.3 ms | p95 ≤ 500 ms |
| same · `updateMany` per status | 3.4 ms | 6.8 ms | 23.7 ms | p95 ≤ 500 ms |
| same · one `UPDATE … FROM (VALUES …)` | 2.7 ms | 6.1 ms | 9.8 ms | p95 ≤ 500 ms |

All three attendance variants return identical rows (46 players, 4,683 counted invitations).

`EXPLAIN (ANALYZE, BUFFERS)` of the attendance query: 7.6 ms, index scans only (`event_categories (category_id, event_id)`, `events (id, club_id)`, `event_invitees (event_id, rsvp_status)`, `category_memberships (club_membership_id)` for the membership-on-date check), all buffers hit. The membership check is the largest share (4,662 index lookups); a `(club_membership_id, category_id)` index would tighten it if F04 needs it.

## Findings

- Performance is two orders of magnitude inside NFR-PERF-01 at Year-1 volume. Production adds network round trips (an interactive RSVP transaction makes ~5) and cold-cache reads; neither threatens the targets.
- TypedSQL is still a preview feature (`typedSql`) and `prisma generate --sql` needs a migrated, reachable database, which turbo's `db:generate`, lint and typecheck don't have. Every `count(*)` comes back typed `number | null`. `$queryRaw` with a declared row type performs the same and needs no database at build time.
- The query API version works but has to move the membership-on-date rule into TypeScript; keep that rule in SQL.
- Roll call: per-row updates are 2.5× slower but fine; `updateMany` per status stays typed and is within 10% of raw SQL.
- Schema side (from the TECH-03 PRs): partial unique indexes (`partialIndexes` preview), composite tenant FKs including nullable columns, CHECK constraints and expression indexes in migration SQL that drift checks leave alone, and migrations generated offline with `migrate diff --from-schema`.
- Gotchas: `pg` waits forever for a connection unless `connectionTimeoutMillis` is set; error `meta` carries the failing row on CHECK violations; `migrate reset` refuses to run from an AI agent without the user's consent text.
