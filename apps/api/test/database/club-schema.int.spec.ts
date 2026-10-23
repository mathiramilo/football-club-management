import { afterAll, beforeAll, describe, inject, it } from 'vitest';

import { PrismaService } from '../../src/core/database/prisma.service.js';
import { expectViolation } from '../support/constraints.js';
import {
  createCategory,
  createCategoryMembership,
  createClub,
  createMember,
  createUser,
} from '../support/factories.js';

describe('Club schema invariants (TECH-03, data model § 4)', () => {
  let db: PrismaService;

  beforeAll(() => {
    db = new PrismaService(inject('databaseUrl'));
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it('allows one owner per club', async () => {
    const club = await createClub(db);
    const otherClub = await createClub(db);
    await createMember(db, club, { isOwner: true });
    await createMember(db, otherClub, { isOwner: true });

    await expectViolation(
      createMember(db, club, { isOwner: true }),
      'club_memberships_one_owner_per_club',
    );
  });

  it('requires first and last name on managed profiles (BR-CLUB-11)', async () => {
    const club = await createClub(db);
    const user = await createUser(db);
    await createMember(db, club, {
      userId: user.id,
      managedFirstName: null,
      managedLastName: null,
    });

    await expectViolation(
      createMember(db, club, { managedLastName: null }),
      'club_memberships_managed_profile_name_check',
    );
  });

  it('rejects duplicate active category names ignoring case and accents (BR-CLUB-02)', async () => {
    const club = await createClub(db);
    const otherClub = await createClub(db);
    const archived = await createCategory(db, club, { name: 'Reserva' });
    await db.category.update({ where: { id: archived.id }, data: { archivedAt: new Date() } });
    await createCategory(db, club, { name: 'Reserva' });
    await createCategory(db, club, { name: 'Categoría Sub-20' });
    await createCategory(db, otherClub, { name: 'Categoría Sub-20' });

    await expectViolation(
      createCategory(db, club, { name: 'categoria SUB-20' }),
      'categories_club_id_name_active_key',
    );
  });

  it('requires a category membership to be staff, player or both', async () => {
    const club = await createClub(db);
    const category = await createCategory(db, club);
    const member = await createMember(db, club);
    await createCategoryMembership(db, category, member, { staffRole: 'dt', isPlayer: true });

    await expectViolation(
      createCategoryMembership(db, category, await createMember(db, club), {
        staffRole: null,
        isPlayer: false,
      }),
      'category_memberships_staff_or_player_check',
    );
  });

  it('allows one open membership per person and category (BR-CLUB-06)', async () => {
    const club = await createClub(db);
    const category = await createCategory(db, club);
    const member = await createMember(db, club);
    await createCategoryMembership(db, category, member, {
      startsOn: new Date('2025-03-01'),
      endsOn: new Date('2025-12-31'),
    });
    await createCategoryMembership(db, category, member, { startsOn: new Date('2026-03-01') });

    await expectViolation(
      createCategoryMembership(db, category, member, { startsOn: new Date('2026-06-01') }),
      'category_memberships_one_open_per_person',
    );
  });

  it('keeps a category membership inside the club of its category and member', async () => {
    const club = await createClub(db);
    const category = await createCategory(db, club);
    const outsider = await createMember(db, await createClub(db));

    await expectViolation(
      db.categoryMembership.create({
        data: {
          clubId: club.id,
          categoryId: category.id,
          clubMembershipId: outsider.id,
          isPlayer: true,
          startsOn: new Date('2026-03-01'),
        },
      }),
      'category_memberships_club_membership_id_club_id_fkey',
    );
  });

  it('limits player details to glossary positions and jersey numbers 1–99 (AUTH-10)', async () => {
    const club = await createClub(db);
    await createMember(db, club, {
      primaryPosition: 'gk',
      secondaryPositions: ['cb', 'piv'],
      jerseyNumber: 99,
    });

    await expectViolation(
      createMember(db, club, { primaryPosition: 'goalkeeper' }),
      'club_memberships_primary_position_check',
    );
    await expectViolation(
      createMember(db, club, { secondaryPositions: ['cb', 'rb', 'lb'] }),
      'club_memberships_secondary_positions_check',
    );
    await expectViolation(
      createMember(db, club, { jerseyNumber: 0 }),
      'club_memberships_jersey_number_check',
    );
  });

  it.each([
    [
      'categories_format_check',
      () => createClub(db).then((club) => createCategory(db, club, { format: 'f6' })),
    ],
    [
      'categories_gender_check',
      () => createClub(db).then((club) => createCategory(db, club, { gender: 'male' })),
    ],
    [
      'club_memberships_status_check',
      () => createClub(db).then((club) => createMember(db, club, { status: 'left' })),
    ],
    [
      'category_memberships_staff_role_check',
      () =>
        createClub(db).then(async (club) =>
          createCategoryMembership(
            db,
            await createCategory(db, club),
            await createMember(db, club),
            {
              staffRole: 'physio',
            },
          ),
        ),
    ],
  ])('rejects values outside the glossary (%s)', async (constraint, write) => {
    await expectViolation(write(), constraint);
  });
});
