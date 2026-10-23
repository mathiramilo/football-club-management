import { randomBytes } from 'node:crypto';

import { TZDate } from '@date-fns/tz';
import { fakerES as faker } from '@faker-js/faker';
import { v7 as uuidv7 } from 'uuid';

import type { Prisma } from '../../src/generated/prisma/client.js';

export interface ClubRows {
  users: Prisma.UserCreateManyInput[];
  club: Prisma.ClubCreateManyInput;
  venues: Prisma.VenueCreateManyInput[];
  categories: Prisma.CategoryCreateManyInput[];
  clubMemberships: Prisma.ClubMembershipCreateManyInput[];
  categoryMemberships: Prisma.CategoryMembershipCreateManyInput[];
  events: Prisma.EventCreateManyInput[];
  eventCategories: Prisma.EventCategoryCreateManyInput[];
  eventInvitees: Prisma.EventInviteeCreateManyInput[];
  rsvpChanges: Prisma.RsvpChangeCreateManyInput[];
}

interface CategoryTemplate {
  name: string;
  format: 'f11' | 'futsal';
  gender: 'men' | 'women' | 'mixed';
  ages: [number, number];
  ageGroup?: string;
}

interface Person {
  membershipId: string;
  userId: string | null;
}

interface Player extends Person {
  startsOn: string;
  endsOn: string | null;
  commitment: number;
  responseRate: number;
}

interface Squad {
  size: [number, number];
  positions: string[];
  practiceDays: number[];
  practiceTime: [number, number];
  matchDay: number;
  matchTime: [number, number];
  matchMin: number;
}

interface SeededEvent {
  id: string;
  startsAt: Date;
  rsvpDeadlineAt: Date;
  rollCallCompletedAt: Date | null;
}

interface SeededCategory {
  id: string;
  template: CategoryTemplate;
  dt: Person;
  players: Player[];
}

const COUNTRIES = [
  { countryCode: 'UY', timezone: 'America/Montevideo' },
  { countryCode: 'AR', timezone: 'America/Argentina/Buenos_Aires' },
];

const PRIMERA: CategoryTemplate = { name: 'Primera', format: 'f11', gender: 'men', ages: [20, 34] };
const OTHER_CATEGORIES: CategoryTemplate[] = [
  { name: 'Reserva', format: 'f11', gender: 'men', ages: [19, 30] },
  { name: 'Sub-20', format: 'f11', gender: 'men', ages: [16, 19], ageGroup: 'Sub-20' },
  { name: 'Femenino', format: 'f11', gender: 'women', ages: [17, 32] },
  { name: 'Futsal', format: 'futsal', gender: 'mixed', ages: [18, 35] },
];

const SQUADS: Record<CategoryTemplate['format'], Squad> = {
  f11: {
    size: [22, 26],
    positions: [
      'gk',
      'gk',
      'gk',
      'cb',
      'cb',
      'cb',
      'cb',
      'rb',
      'lb',
      'rwb',
      'lwb',
      'dm',
      'dm',
    ].concat(['cm', 'cm', 'cm', 'am', 'am', 'rm', 'lm', 'rw', 'lw', 'st', 'st', 'st', 'cb']),
    practiceDays: [1, 3, 5],
    practiceTime: [20, 0],
    matchDay: 6,
    matchTime: [16, 0],
    matchMin: 105,
  },
  futsal: {
    size: [12, 14],
    positions: [
      'gk',
      'gk',
      'fx',
      'fx',
      'fx',
      'ala',
      'ala',
      'ala',
      'ala',
      'piv',
      'piv',
      'piv',
      'fx',
      'ala',
    ],
    practiceDays: [2, 4],
    practiceTime: [21, 0],
    matchDay: 0,
    matchTime: [11, 0],
    matchMin: 60,
  },
};

const NICKNAMES = ['Flaco', 'Pato', 'Pelado', 'Colo', 'Toto', 'Lalo', 'Rulo', 'Pipa'];
const MINUTE = 60_000;
const DAY = 1_440 * MINUTE;

const notGoingReason = () =>
  faker.helpers.weightedArrayElement([
    { value: 'work_study', weight: 40 },
    { value: 'personal', weight: 25 },
    { value: 'injury_illness', weight: 15 },
    { value: 'travel', weight: 10 },
    { value: 'other', weight: 10 },
  ]);

const playerSource = () =>
  faker.helpers.weightedArrayElement([
    { value: 'app', weight: 70 },
    { value: 'push_action', weight: 20 },
    { value: 'web_link', weight: 10 },
  ]);

function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function addYears(isoDate: string, years: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCFullYear(date.getUTCFullYear() + years);
  return date.toISOString().slice(0, 10);
}

const weekday = (isoDate: string) => new Date(`${isoDate}T00:00:00Z`).getUTCDay();
const calendarDay = (isoDate: string) => new Date(`${isoDate}T00:00:00Z`);

function atLocalTime(isoDate: string, [hours, minutes]: [number, number], timezone: string) {
  const day = calendarDay(isoDate);
  const local = new TZDate(
    day.getUTCFullYear(),
    day.getUTCMonth(),
    day.getUTCDate(),
    hours,
    minutes,
    timezone,
  );
  return new Date(local.getTime());
}

export function generateClub(today: string, months: number): ClubRows {
  const { countryCode, timezone } = faker.helpers.arrayElement(COUNTRIES);
  const city = faker.location.city();
  const clubId = uuidv7();
  const periodStart = addDays(today, -Math.round(months * 30.4));
  const reference = atLocalTime(today, [12, 0], timezone);
  const rows: ClubRows = {
    users: [],
    club: {
      id: clubId,
      name: `Club Atlético ${city}`,
      shortName: city.slice(0, 12),
      countryCode,
      timezone,
    },
    venues: [
      { id: uuidv7(), clubId, name: 'Cancha principal', address: faker.location.streetAddress() },
      {
        id: uuidv7(),
        clubId,
        name: `Complejo ${faker.location.street()}`,
        address: faker.location.streetAddress(),
      },
    ],
    categories: [],
    clubMemberships: [],
    categoryMemberships: [],
    events: [],
    eventCategories: [],
    eventInvitees: [],
    rsvpChanges: [],
  };

  function addPerson(
    sex: 'female' | 'male',
    [minAge, maxAge]: [number, number],
    withAccount: boolean,
    membership: Partial<Prisma.ClubMembershipCreateManyInput> = {},
  ): Person {
    const firstName = faker.person.firstName(sex);
    const lastName = faker.person.lastName();
    const age = faker.number.int({ min: minAge, max: maxAge });
    const birthdate = calendarDay(addDays(addYears(today, -age), -faker.number.int(364)));
    const userId = withAccount ? uuidv7() : null;
    if (userId) {
      rows.users.push({
        id: userId,
        email: `${faker.helpers.slugify(`${firstName}.${lastName}`).toLowerCase()}.${userId.slice(-8)}@example.test`,
        emailVerified: true,
        firstName,
        lastName,
        nickname: faker.datatype.boolean(0.15) ? faker.helpers.arrayElement(NICKNAMES) : null,
        birthdate,
      });
    }
    const membershipId = uuidv7();
    rows.clubMemberships.push({
      id: membershipId,
      clubId,
      userId,
      ...(userId
        ? {}
        : { managedFirstName: firstName, managedLastName: lastName, managedBirthdate: birthdate }),
      ...membership,
    });
    return { membershipId, userId };
  }

  function joinCategory(
    categoryId: string,
    clubMembershipId: string,
    membership: { startsOn: string; endsOn?: string | null; staffRole?: 'dt' | 'coach' },
  ) {
    rows.categoryMemberships.push({
      id: uuidv7(),
      clubId,
      categoryId,
      clubMembershipId,
      staffRole: membership.staffRole ?? null,
      isPlayer: !membership.staffRole,
      startsOn: calendarDay(membership.startsOn),
      endsOn: membership.endsOn ? calendarDay(membership.endsOn) : null,
    });
  }

  addPerson('male', [35, 65], true, { isOwner: true, isAdmin: true });

  const categories = [
    PRIMERA,
    ...faker.helpers.arrayElements(OTHER_CATEGORIES, { min: 2, max: 4 }),
  ].map((template): SeededCategory => {
    const id = uuidv7();
    rows.categories.push({
      id,
      clubId,
      name: template.name,
      format: template.format,
      gender: template.gender,
      ageGroup: template.ageGroup,
    });
    const sexOf = () =>
      template.gender === 'mixed'
        ? faker.helpers.arrayElement(['female', 'male'] as const)
        : template.gender === 'women'
          ? 'female'
          : 'male';
    const addStaff = (staffRole: 'dt' | 'coach') => {
      const person = addPerson(sexOf(), [28, 60], true);
      joinCategory(id, person.membershipId, { staffRole, startsOn: addDays(periodStart, -90) });
      return person;
    };
    const dt = addStaff('dt');
    addStaff('coach');
    const squad = SQUADS[template.format];
    const players = Array.from(
      { length: faker.number.int({ min: squad.size[0], max: squad.size[1] }) },
      (_, i) => {
        const primaryPosition = squad.positions[i % squad.positions.length] ?? 'cm';
        const person = addPerson(sexOf(), template.ages, faker.datatype.boolean(0.85), {
          primaryPosition,
          secondaryPositions: faker.datatype.boolean(0.3)
            ? [faker.helpers.arrayElement(squad.positions.filter((p) => p !== primaryPosition))]
            : [],
          jerseyNumber: faker.datatype.boolean(0.8) ? i + 1 : null,
        });
        const joinsMidPeriod = faker.datatype.boolean(0.12);
        const startsOn = joinsMidPeriod
          ? addDays(periodStart, faker.number.int({ min: 1, max: months * 28 }))
          : addDays(periodStart, -faker.number.int(365));
        const endsOn = faker.datatype.boolean(0.06)
          ? addDays(startsOn, faker.number.int({ min: 30, max: months * 30 }))
          : null;
        return {
          ...person,
          startsOn,
          endsOn: endsOn && endsOn < today ? endsOn : null,
          commitment: faker.number.float({ min: 0.55, max: 0.95 }),
          responseRate: faker.number.float({ min: 0.75, max: 1 }),
        };
      },
    );
    for (const player of players) {
      joinCategory(id, player.membershipId, player);
    }
    return { id, template, dt, players };
  });

  const [primera] = categories;
  const youth = categories.find((category) => category.template.name === 'Sub-20');
  if (primera && youth) {
    // BR-CLUB-06: an "Add" keeps the youth membership and opens a second one in Primera.
    for (const player of faker.helpers.arrayElements(
      youth.players.filter((p) => !p.endsOn),
      2,
    )) {
      const startsOn = addDays(periodStart, faker.number.int({ min: 0, max: months * 15 }));
      joinCategory(primera.id, player.membershipId, { startsOn });
      primera.players.push({ ...player, startsOn, endsOn: null });
    }
  }

  const isActive = (player: Player, day: string) =>
    player.startsOn <= day && (!player.endsOn || player.endsOn >= day);

  function addInvitee(
    event: SeededEvent,
    category: SeededCategory,
    player: Player,
    source: string,
  ) {
    const id = uuidv7();
    const { startsAt, rsvpDeadlineAt: deadline, rollCallCompletedAt } = event;
    const farAway = startsAt.getTime() - reference.getTime() > 7 * DAY;
    const proxy = !player.userId || faker.datatype.boolean(0.03);
    const answers = player.userId
      ? faker.datatype.boolean(player.responseRate * (farAway ? 0.3 : 1))
      : faker.datatype.boolean(0.5);
    const answeredAt = new Date(
      deadline.getTime() - faker.number.int({ min: 60, max: 72 * 60 }) * MINUTE,
    );
    const changes: Prisma.RsvpChangeCreateManyInput[] = [];
    let status = 'pending';
    let reason: string | null = null;
    const arrivingLate = answers && faker.datatype.boolean(0.06);
    if (answers && answeredAt < reference) {
      status = faker.datatype.boolean(player.commitment) ? 'going' : 'not_going';
      reason = status === 'not_going' ? notGoingReason() : null;
      changes.push({
        id: uuidv7(),
        clubId,
        eventInviteeId: id,
        fromStatus: 'pending',
        toStatus: status,
        reason,
        arrivingLate: status === 'going' && arrivingLate,
        source: proxy ? 'proxy' : playerSource(),
        changedBy: proxy ? category.dt.userId : player.userId,
        changedAt: answeredAt,
      });
      const dropsOutAt = new Date(
        deadline.getTime() + faker.number.int({ min: 10, max: 90 }) * MINUTE,
      );
      if (
        status === 'going' &&
        !proxy &&
        faker.datatype.boolean(0.04) &&
        dropsOutAt < startsAt &&
        dropsOutAt < reference
      ) {
        reason = notGoingReason();
        changes.push({
          id: uuidv7(),
          clubId,
          eventInviteeId: id,
          fromStatus: 'going',
          toStatus: 'not_going',
          reason,
          source: 'app',
          changedBy: player.userId,
          changedAt: dropsOutAt,
          afterDeadline: true,
        });
        status = 'not_going';
      }
    }
    const attendance = rollCallCompletedAt
      ? attendanceFor(status, status === 'going' && arrivingLate)
      : null;
    rows.eventInvitees.push({
      id,
      clubId,
      eventId: event.id,
      clubMembershipId: player.membershipId,
      source,
      rsvpStatus: status,
      rsvpReason: reason,
      arrivingLate: status === 'going' && arrivingLate,
      firstRespondedAt: changes[0]?.changedAt ?? null,
      respondedAt: changes.at(-1)?.changedAt ?? null,
      rsvpIsLate: changes.some((change) => change.afterDeadline),
      rsvpSetBy: proxy && changes.length > 0 ? category.dt.membershipId : null,
      attendanceStatus: attendance?.status ?? null,
      absenceJustified: attendance?.justified ?? null,
      attendanceRecordedBy: attendance ? category.dt.userId : null,
      attendanceRecordedAt: attendance ? rollCallCompletedAt : null,
    });
    rows.rsvpChanges.push(...changes);
  }

  const periodEnd = addDays(today, 21);
  for (const category of categories) {
    const squad = SQUADS[category.template.format];
    for (let day = periodStart; day <= periodEnd; day = addDays(day, 1)) {
      const types = [
        ...(squad.practiceDays.includes(weekday(day)) ? (['practice'] as const) : []),
        ...(weekday(day) === squad.matchDay && faker.datatype.boolean(0.85)
          ? (['match'] as const)
          : []),
      ];
      for (const type of types) {
        const isMatch = type === 'match';
        const startsAt = atLocalTime(day, isMatch ? squad.matchTime : squad.practiceTime, timezone);
        const endsAt = new Date(startsAt.getTime() + (isMatch ? squad.matchMin : 90) * MINUTE);
        const homeAway = isMatch ? faker.helpers.arrayElement(['home', 'away'] as const) : null;
        const cancelled = faker.datatype.boolean(0.03);
        const rollCall = endsAt < reference && !cancelled && faker.datatype.boolean(0.92);
        const event = {
          id: uuidv7(),
          clubId,
          type,
          startsAt,
          endsAt,
          meetAt: new Date(startsAt.getTime() - (isMatch ? 60 : 15) * MINUTE),
          rsvpDeadlineAt: new Date(startsAt.getTime() - (isMatch ? 24 * 60 : 120) * MINUTE),
          venueId: homeAway === 'away' ? null : rows.venues[0]?.id,
          locationText: homeAway === 'away' ? `Cancha de ${faker.location.city()}` : null,
          opponent: isMatch
            ? `${faker.helpers.arrayElement(['Atlético', 'Deportivo', 'Sportivo', 'Unión'])} ${faker.location.city()}`
            : null,
          homeAway,
          competition: isMatch
            ? day.slice(5, 7) <= '06'
              ? 'Torneo Apertura'
              : 'Torneo Clausura'
            : null,
          shareToken: randomBytes(12).toString('base64url'),
          cancelledAt: cancelled ? new Date(startsAt.getTime() - DAY) : null,
          cancelledBy: cancelled ? category.dt.userId : null,
          rollCallCompletedAt: rollCall ? new Date(endsAt.getTime() + 30 * MINUTE) : null,
          rollCallCompletedBy: rollCall ? category.dt.userId : null,
          createdBy: category.dt.userId,
        };
        rows.events.push(event);
        rows.eventCategories.push({ eventId: event.id, categoryId: category.id, clubId });
        for (const player of category.players.filter((p) => isActive(p, day))) {
          addInvitee(event, category, player, 'category');
        }
        if (isMatch && category === primera && faker.datatype.boolean(0.3)) {
          const invited = new Set(category.players.map((p) => p.membershipId));
          const candidates = new Map(
            categories
              .flatMap((c) => c.players)
              .filter((p) => !invited.has(p.membershipId) && isActive(p, day))
              .map((p) => [p.membershipId, p]),
          );
          for (const player of faker.helpers.arrayElements([...candidates.values()], {
            min: 1,
            max: 2,
          })) {
            addInvitee(event, category, player, 'call_up');
          }
        }
      }
    }
  }
  return rows;
}

function attendanceFor(
  status: string,
  arrivingLate: boolean,
): { status: string; justified: boolean | null } {
  if (status === 'not_going') {
    return { status: 'absent', justified: faker.datatype.boolean(0.85) };
  }
  if (status === 'pending') {
    return faker.datatype.boolean(0.4)
      ? { status: 'present', justified: null }
      : { status: 'absent', justified: false };
  }
  if (arrivingLate && faker.datatype.boolean(0.7)) {
    return { status: 'late', justified: null };
  }
  return faker.helpers.weightedArrayElement([
    { value: { status: 'present', justified: null }, weight: 88 },
    { value: { status: 'late', justified: null }, weight: 7 },
    { value: { status: 'absent', justified: false }, weight: 5 },
  ]);
}
