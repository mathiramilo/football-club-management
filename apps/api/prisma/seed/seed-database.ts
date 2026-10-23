import { fakerES as faker } from '@faker-js/faker';

import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { type ClubRows, generateClub } from './club-generator.js';

export interface SeedOptions {
  clubs: number;
  months: number;
  seed: number;
  today: string;
}

export type SeedCounts = Record<Exclude<keyof ClubRows, 'club'> | 'clubs', number>;

const BATCH_SIZE = 1_000;

async function inBatches<T>(rows: T[], write: (batch: T[]) => Promise<unknown>): Promise<void> {
  for (let start = 0; start < rows.length; start += BATCH_SIZE) {
    await write(rows.slice(start, start + BATCH_SIZE));
  }
}

async function insertClub(db: PrismaClient, rows: ClubRows): Promise<void> {
  await inBatches(rows.users, (data) => db.user.createMany({ data }));
  await db.club.create({ data: rows.club });
  await db.venue.createMany({ data: rows.venues });
  await db.category.createMany({ data: rows.categories });
  await inBatches(rows.clubMemberships, (data) => db.clubMembership.createMany({ data }));
  await inBatches(rows.categoryMemberships, (data) => db.categoryMembership.createMany({ data }));
  await inBatches(rows.events, (data) => db.event.createMany({ data }));
  await inBatches(rows.eventCategories, (data) => db.eventCategory.createMany({ data }));
  await inBatches(rows.eventInvitees, (data) => db.eventInvitee.createMany({ data }));
  await inBatches(rows.rsvpChanges, (data) => db.rsvpChange.createMany({ data }));
}

export async function seedDatabase(
  db: PrismaClient,
  options: SeedOptions,
  onClubSeeded: (clubIndex: number) => void = () => undefined,
): Promise<{ clubIds: string[]; counts: SeedCounts }> {
  faker.seed(options.seed);
  const clubIds: string[] = [];
  const counts: SeedCounts = {
    clubs: 0,
    users: 0,
    venues: 0,
    categories: 0,
    clubMemberships: 0,
    categoryMemberships: 0,
    events: 0,
    eventCategories: 0,
    eventInvitees: 0,
    rsvpChanges: 0,
  };

  for (let clubIndex = 0; clubIndex < options.clubs; clubIndex++) {
    const rows = generateClub(options.today, options.months);
    await insertClub(db, rows);
    clubIds.push(rows.club.id ?? '');
    counts.clubs++;
    for (const table of Object.keys(counts) as (keyof SeedCounts)[]) {
      if (table !== 'clubs') {
        counts[table] += rows[table].length;
      }
    }
    onClubSeeded(clubIndex);
  }

  return { clubIds, counts };
}
