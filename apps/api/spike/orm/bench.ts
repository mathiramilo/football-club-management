import { performance } from 'node:perf_hooks';

import { TZDate } from '@date-fns/tz';
import { format } from 'date-fns';
import { z } from 'zod';

import { PrismaService } from '../../src/core/database/prisma.service.js';
import { Prisma } from '../../src/generated/prisma/client.js';
import { categoryAttendance } from '../../src/generated/prisma/sql/categoryAttendance.js';

type Row = categoryAttendance.Result;

function pick<T>(items: T[], index: number): T {
  const item = items[index];
  if (item === undefined) throw new Error(`Not enough sample rows (wanted index ${String(index)})`);
  return item;
}

const db = new PrismaService(z.url().parse(process.env.DATABASE_URL));
const results: Record<string, { runs: number; p50: number; p95: number; max: number }> = {};
const to = new Date('2026-10-23T15:00:00Z');
const from = new Date(to.getTime() - 365 * 86_400_000);

async function measure(
  label: string,
  runs: number,
  run: (i: number) => Promise<unknown>,
  concurrency = 1,
) {
  const durations: number[] = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (next < runs) {
        const i = next++;
        const start = performance.now();
        await run(i);
        durations.push(performance.now() - start);
      }
    }),
  );
  durations.sort((a, b) => a - b);
  const at = (q: number) =>
    Math.round(
      (durations[Math.min(durations.length - 1, Math.floor(q * durations.length))] ?? 0) * 10,
    ) / 10;
  results[label] = { runs, p50: at(0.5), p95: at(0.95), max: at(1) };
  process.stdout.write(
    `${label.padEnd(48)} p50 ${String(at(0.5)).padStart(7)} ms  p95 ${String(at(0.95)).padStart(7)} ms  max ${String(at(1)).padStart(7)} ms\n`,
  );
}

const [target] = await db.$queryRaw<
  { clubId: string; categoryId: string; timezone: string; invitations: number }[]
>`
  SELECT ec.club_id AS "clubId", ec.category_id AS "categoryId", c.timezone, count(*)::int AS invitations
  FROM event_categories ec
  JOIN event_invitees i ON i.event_id = ec.event_id
  JOIN clubs c ON c.id = ec.club_id
  GROUP BY 1, 2, 3 ORDER BY 4 DESC LIMIT 1`;
if (!target) throw new Error('Seed the spike database first.');
const { clubId, categoryId, timezone } = target;
const totals = await db.$queryRaw<{ events: number; invitees: number; changes: number }[]>`
  SELECT (SELECT count(*)::int FROM events) AS events, (SELECT count(*)::int FROM event_invitees) AS invitees,
         (SELECT count(*)::int FROM rsvp_changes) AS changes`;
process.stdout.write(
  `Data: ${JSON.stringify(totals[0])}\nTarget category ${categoryId} (club ${clubId}), ${String(target.invitations)} invitations\n\n`,
);

const viaTypedSql = () => db.$queryRawTyped(categoryAttendance(clubId, categoryId, from, to));

const viaQueryRaw = () => db.$queryRaw<Row[]>`
  WITH eligible AS (
    SELECT e.id, (e.starts_at AT TIME ZONE c.timezone)::date AS local_date
    FROM event_categories ec
    JOIN events e ON e.id = ec.event_id AND e.club_id = ec.club_id
    JOIN clubs c ON c.id = e.club_id
    WHERE ec.club_id = ${clubId}::uuid AND ec.category_id = ${categoryId}::uuid
      AND e.cancelled_at IS NULL AND e.roll_call_completed_at IS NOT NULL
      AND e.starts_at >= ${from} AND e.starts_at < ${to})
  SELECT i.club_membership_id AS "clubMembershipId", count(*)::int AS "invited",
    count(*) FILTER (WHERE i.attendance_status IN ('present', 'late'))::int AS "attended",
    count(*) FILTER (WHERE i.attendance_status = 'late')::int AS "late",
    count(*) FILTER (WHERE i.attendance_status = 'absent' AND i.absence_justified)::int AS "justifiedAbsences",
    count(*) FILTER (WHERE i.attendance_status = 'absent' AND i.absence_justified IS NOT TRUE)::int AS "unjustifiedAbsences",
    count(*) FILTER (WHERE i.attendance_status = 'absent' AND i.rsvp_status = 'going')::int AS "noShows"
  FROM eligible ev
  JOIN event_invitees i ON i.event_id = ev.id AND i.club_id = ${clubId}::uuid
  WHERE i.source <> 'category' OR EXISTS (
    SELECT 1 FROM category_memberships cm
    WHERE cm.club_id = ${clubId}::uuid AND cm.category_id = ${categoryId}::uuid
      AND cm.club_membership_id = i.club_membership_id AND cm.is_player
      AND cm.starts_on <= ev.local_date AND (cm.ends_on IS NULL OR cm.ends_on >= ev.local_date))
  GROUP BY i.club_membership_id ORDER BY "attended" DESC`;

async function viaQueryApi(): Promise<Row[]> {
  const events = await db.event.findMany({
    where: {
      clubId,
      cancelledAt: null,
      rollCallCompletedAt: { not: null },
      startsAt: { gte: from, lt: to },
      eventCategories: { some: { categoryId } },
    },
    select: { id: true, startsAt: true },
  });
  const localDate = new Map(
    events.map((e) => [e.id, format(new TZDate(e.startsAt, timezone), 'yyyy-MM-dd')]),
  );
  const [invitees, memberships] = await Promise.all([
    db.eventInvitee.findMany({
      where: { clubId, eventId: { in: events.map((e) => e.id) } },
      select: {
        clubMembershipId: true,
        eventId: true,
        source: true,
        attendanceStatus: true,
        absenceJustified: true,
        rsvpStatus: true,
      },
    }),
    db.categoryMembership.findMany({
      where: { clubId, categoryId, isPlayer: true },
      select: { clubMembershipId: true, startsOn: true, endsOn: true },
    }),
  ]);
  const day = (d: Date) => d.toISOString().slice(0, 10);
  const rows = new Map<string, Row>();
  for (const i of invitees) {
    const date = localDate.get(i.eventId) ?? '';
    const counts =
      i.source !== 'category' ||
      memberships.some(
        (m) =>
          m.clubMembershipId === i.clubMembershipId &&
          day(m.startsOn) <= date &&
          (!m.endsOn || day(m.endsOn) >= date),
      );
    if (!counts) continue;
    const row = rows.get(i.clubMembershipId) ?? {
      clubMembershipId: i.clubMembershipId,
      invited: 0,
      attended: 0,
      late: 0,
      justifiedAbsences: 0,
      unjustifiedAbsences: 0,
      noShows: 0,
    };
    const absent = i.attendanceStatus === 'absent';
    rows.set(i.clubMembershipId, {
      ...row,
      invited: (row.invited ?? 0) + 1,
      attended:
        (row.attended ?? 0) +
        (i.attendanceStatus === 'present' || i.attendanceStatus === 'late' ? 1 : 0),
      late: (row.late ?? 0) + (i.attendanceStatus === 'late' ? 1 : 0),
      justifiedAbsences: (row.justifiedAbsences ?? 0) + (absent && i.absenceJustified ? 1 : 0),
      unjustifiedAbsences: (row.unjustifiedAbsences ?? 0) + (absent && !i.absenceJustified ? 1 : 0),
      noShows: (row.noShows ?? 0) + (absent && i.rsvpStatus === 'going' ? 1 : 0),
    });
  }
  return [...rows.values()];
}

const signature = (rows: Row[]) =>
  JSON.stringify([...rows].sort((a, b) => a.clubMembershipId.localeCompare(b.clubMembershipId)));
const [typed, raw, api] = await Promise.all([viaTypedSql(), viaQueryRaw(), viaQueryApi()]);
process.stdout.write(
  `Attendance rows: ${String(typed.length)}; $queryRaw matches: ${String(signature(raw) === signature(typed))}; query API matches: ${String(signature(api) === signature(typed))}\n`,
);

await measure('ANL-03 attendance · TypedSQL', 50, viaTypedSql);
await measure('ANL-03 attendance · $queryRaw', 50, viaQueryRaw);
await measure('ANL-03 attendance · query API + TypeScript', 50, viaQueryApi);
await measure('ANL-03 attendance · TypedSQL, 10 concurrent', 100, viaTypedSql, 10);

const now = new Date();
const futureInvitees = await db.$queryRaw<
  { id: string; clubId: string; eventId: string; clubMembershipId: string; userId: string }[]
>`
  SELECT i.id, i.club_id AS "clubId", i.event_id AS "eventId", i.club_membership_id AS "clubMembershipId", m.user_id AS "userId"
  FROM event_invitees i
  JOIN events e ON e.id = i.event_id
  JOIN club_memberships m ON m.id = i.club_membership_id
  WHERE e.starts_at > ${now} AND e.cancelled_at IS NULL AND m.user_id IS NOT NULL
  ORDER BY md5(i.id::text) LIMIT 600`;

async function respond(invitee: (typeof futureInvitees)[number], going: boolean) {
  await db.$transaction(async (tx) => {
    const current = await tx.eventInvitee.findFirstOrThrow({
      where: {
        clubId: invitee.clubId,
        eventId: invitee.eventId,
        clubMembershipId: invitee.clubMembershipId,
      },
      select: {
        id: true,
        rsvpStatus: true,
        firstRespondedAt: true,
        event: { select: { rsvpDeadlineAt: true, rsvpLocked: true } },
      },
    });
    const afterDeadline = now > current.event.rsvpDeadlineAt;
    if (current.event.rsvpLocked && afterDeadline) throw new Error('RSVP_LOCKED');
    const status = going ? 'going' : 'not_going';
    const reason = going ? null : 'work_study';
    await tx.eventInvitee.update({
      where: { id: current.id },
      data: {
        rsvpStatus: status,
        rsvpReason: reason,
        respondedAt: now,
        firstRespondedAt: current.firstRespondedAt ?? now,
        rsvpIsLate: afterDeadline,
      },
    });
    await tx.rsvpChange.create({
      data: {
        clubId: invitee.clubId,
        eventInviteeId: current.id,
        fromStatus: current.rsvpStatus,
        toStatus: status,
        reason,
        source: 'app',
        changedBy: invitee.userId,
        changedAt: now,
        afterDeadline,
      },
    });
  });
}

process.stdout.write('\n');
await measure('EVT-08 RSVP write · interactive tx, sequential', 300, (i) =>
  respond(pick(futureInvitees, i), i % 4 !== 0),
);
await measure(
  'EVT-08 RSVP write · interactive tx, 20 concurrent',
  300,
  (i) => respond(pick(futureInvitees, 300 + i), i % 4 !== 0),
  20,
);

const rollCallEvents = await db.$queryRaw<{ id: string; clubId: string }[]>`
  SELECT e.id, e.club_id AS "clubId" FROM events e
  WHERE e.roll_call_completed_at IS NOT NULL AND e.type = 'practice'
  ORDER BY md5(e.id::text) LIMIT 300`;
const entriesFor = async (event: { id: string; clubId: string }) =>
  (
    await db.eventInvitee.findMany({
      where: { clubId: event.clubId, eventId: event.id },
      select: { id: true },
    })
  ).map((invitee, n) => ({
    id: invitee.id,
    status: n % 10 === 0 ? 'absent' : n % 7 === 0 ? 'late' : 'present',
    justified: n % 20 === 0 ? true : null,
  }));

async function rollCallPerRow(event: { id: string; clubId: string }) {
  const entries = await entriesFor(event);
  await db.$transaction(async (tx) => {
    for (const entry of entries) {
      await tx.eventInvitee.updateMany({
        where: { id: entry.id, clubId: event.clubId },
        data: {
          attendanceStatus: entry.status,
          absenceJustified: entry.justified,
          attendanceRecordedAt: now,
          updatedAt: now,
        },
      });
    }
    await tx.event.updateMany({
      where: { id: event.id, clubId: event.clubId },
      data: { rollCallCompletedAt: now, updatedAt: now },
    });
  });
}

async function rollCallGrouped(event: { id: string; clubId: string }) {
  const entries = await entriesFor(event);
  const groups = Map.groupBy(entries, (e) => `${e.status}|${String(e.justified)}`);
  await db.$transaction(async (tx) => {
    for (const group of groups.values()) {
      const [{ status, justified } = { status: 'present', justified: null }] = group;
      await tx.eventInvitee.updateMany({
        where: { clubId: event.clubId, id: { in: group.map((e) => e.id) } },
        data: {
          attendanceStatus: status,
          absenceJustified: justified,
          attendanceRecordedAt: now,
          updatedAt: now,
        },
      });
    }
    await tx.event.updateMany({
      where: { id: event.id, clubId: event.clubId },
      data: { rollCallCompletedAt: now, updatedAt: now },
    });
  });
}

async function rollCallRawValues(event: { id: string; clubId: string }) {
  const entries = await entriesFor(event);
  const values = Prisma.join(
    entries.map((e) => Prisma.sql`(${e.id}::uuid, ${e.status}, ${e.justified}::boolean)`),
  );
  await db.$transaction([
    db.$executeRaw`
      UPDATE event_invitees i SET attendance_status = v.status, absence_justified = v.justified,
        attendance_recorded_at = ${now}, updated_at = ${now}
      FROM (VALUES ${values}) AS v(id, status, justified)
      WHERE i.id = v.id AND i.club_id = ${event.clubId}::uuid`,
    db.event.updateMany({
      where: { id: event.id, clubId: event.clubId },
      data: { rollCallCompletedAt: now, updatedAt: now },
    }),
  ]);
}

process.stdout.write('\n');
await measure('EVT-15 roll call · one update per invitee', 100, (i) =>
  rollCallPerRow(pick(rollCallEvents, i)),
);
await measure('EVT-15 roll call · updateMany per status', 100, (i) =>
  rollCallGrouped(pick(rollCallEvents, 100 + i)),
);
await measure('EVT-15 roll call · one UPDATE … FROM (VALUES …)', 100, (i) =>
  rollCallRawValues(pick(rollCallEvents, 200 + i)),
);

process.stdout.write(`\n${JSON.stringify({ target, totals: totals[0], results }, null, 2)}\n`);
await db.$disconnect();
