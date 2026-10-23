import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';

import { PrismaService } from '../../src/core/database/prisma.service.js';
import { expectViolation } from '../support/constraints.js';
import {
  createCategory,
  createClub,
  createEvent,
  createInvitee,
  createMember,
  createVenue,
} from '../support/factories.js';

describe('Event schema invariants (TECH-03, data model § 4)', () => {
  let db: PrismaService;

  beforeAll(() => {
    db = new PrismaService(inject('databaseUrl'));
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it('keeps one invitee row per person and event', async () => {
    const club = await createClub(db);
    const event = await createEvent(db, club);
    const member = await createMember(db, club);
    await createInvitee(db, event, member);

    await expectViolation(
      createInvitee(db, event, member, { source: 'call_up' }),
      'event_invitees_event_id_club_membership_id_key',
    );
  });

  it('requires a reason when the RSVP is not_going (BR-EVT-07)', async () => {
    const club = await createClub(db);
    const event = await createEvent(db, club);
    await createInvitee(db, event, await createMember(db, club), {
      rsvpStatus: 'not_going',
      rsvpReason: 'work_study',
    });

    await expectViolation(
      createInvitee(db, event, await createMember(db, club), { rsvpStatus: 'not_going' }),
      'event_invitees_not_going_requires_reason_check',
    );
  });

  it('keeps every reference from an event and its invitees inside the club', async () => {
    const club = await createClub(db);
    const otherClub = await createClub(db);
    const event = await createEvent(db, club);
    const otherEvent = await createEvent(db, otherClub);
    const outsider = await createMember(db, otherClub);
    const invitee = await createInvitee(db, event, await createMember(db, club));

    await expectViolation(
      db.eventInvitee.create({
        data: {
          clubId: club.id,
          eventId: event.id,
          clubMembershipId: outsider.id,
          source: 'call_up',
        },
      }),
      'event_invitees_club_membership_id_club_id_fkey',
    );
    await expectViolation(
      createInvitee(db, event, await createMember(db, club), { rsvpSetBy: outsider.id }),
      'event_invitees_rsvp_set_by_club_id_fkey',
    );
    await expectViolation(
      db.eventCategory.create({
        data: {
          clubId: club.id,
          eventId: event.id,
          categoryId: (await createCategory(db, otherClub)).id,
        },
      }),
      'event_categories_category_id_club_id_fkey',
    );
    await expectViolation(
      db.eventCategory.create({
        data: {
          clubId: club.id,
          eventId: otherEvent.id,
          categoryId: (await createCategory(db, club)).id,
        },
      }),
      'event_categories_event_id_club_id_fkey',
    );
    await expectViolation(
      createEvent(db, club, { venueId: (await createVenue(db, otherClub)).id }),
      'events_venue_id_club_id_fkey',
    );
    await expectViolation(
      db.rsvpChange.create({
        data: {
          clubId: otherClub.id,
          eventInviteeId: invitee.id,
          fromStatus: 'pending',
          toStatus: 'going',
          source: 'app',
        },
      }),
      'rsvp_changes_event_invitee_id_club_id_fkey',
    );
  });

  it('rejects a relation connect that would move an event to another club', async () => {
    const club = await createClub(db);
    const event = await createEvent(db, club);
    const foreignVenue = await createVenue(db, await createClub(db));

    await expect(
      db.event.update({
        where: { id: event.id },
        data: { venue: { connect: { id: foreignVenue.id } } },
      }),
    ).rejects.toThrow('club_id cannot change on events');
  });

  it('keeps match details on matches and the end after the start', async () => {
    const club = await createClub(db);
    await createEvent(db, club, { type: 'match', opponent: 'Rival FC', homeAway: 'away' });

    await expectViolation(
      createEvent(db, club, { opponent: 'Rival FC' }),
      'events_match_fields_check',
    );
    await expectViolation(
      createEvent(db, club, {
        startsAt: new Date('2026-11-02T22:00:00Z'),
        endsAt: new Date('2026-11-02T22:00:00Z'),
      }),
      'events_ends_after_start_check',
    );
  });

  it.each([
    [
      'events_type_check',
      () => createClub(db).then((club) => createEvent(db, club, { type: 'training' })),
    ],
    [
      'event_invitees_rsvp_status_check',
      () =>
        createClub(db).then(async (club) =>
          createInvitee(db, await createEvent(db, club), await createMember(db, club), {
            rsvpStatus: 'maybe',
          }),
        ),
    ],
    [
      'event_invitees_attendance_status_check',
      () =>
        createClub(db).then(async (club) =>
          createInvitee(db, await createEvent(db, club), await createMember(db, club), {
            attendanceStatus: 'excused',
          }),
        ),
    ],
  ])('rejects values outside the glossary (%s)', async (constraint, write) => {
    await expectViolation(write(), constraint);
  });

  it('records RSVP history only with glossary statuses and sources (BR-EVT-11, BR-EVT-13)', async () => {
    const club = await createClub(db);
    const invitee = await createInvitee(
      db,
      await createEvent(db, club),
      await createMember(db, club),
    );
    const change = {
      clubId: club.id,
      eventInviteeId: invitee.id,
      fromStatus: 'going',
      toStatus: 'pending',
    };

    await expect(
      db.rsvpChange.create({ data: { ...change, source: 'system_reset' } }),
    ).resolves.toBeDefined();
    await expectViolation(
      db.rsvpChange.create({ data: { ...change, source: 'whatsapp' } }),
      'rsvp_changes_source_check',
    );
    await expectViolation(
      db.rsvpChange.create({ data: { ...change, source: 'app', toStatus: 'maybe' } }),
      'rsvp_changes_to_status_check',
    );
  });
});
