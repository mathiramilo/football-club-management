import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';

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

  it("keeps one person's memberships in a category from overlapping (BR-CLUB-06)", async () => {
    const club = await createClub(db);
    const category = await createCategory(db, club);
    const member = await createMember(db, club);
    const day = (isoDate: string) => new Date(isoDate);
    await createCategoryMembership(db, category, member, {
      startsOn: day('2025-03-01'),
      endsOn: day('2025-12-31'),
    });
    await createCategoryMembership(db, category, member, { startsOn: day('2026-01-01') });
    await createCategoryMembership(db, category, member, {
      startsOn: day('2024-05-10'),
      endsOn: day('2024-05-09'),
    });

    await expectViolation(
      createCategoryMembership(db, category, member, { startsOn: day('2026-06-01') }),
      'category_memberships_no_overlap',
    );
    await expectViolation(
      createCategoryMembership(db, category, member, {
        startsOn: day('2025-06-01'),
        endsOn: day('2025-08-31'),
      }),
      'category_memberships_no_overlap',
    );
    await expectViolation(
      createCategoryMembership(db, category, await createMember(db, club), {
        startsOn: day('2026-03-01'),
        endsOn: day('2026-02-27'),
      }),
      'category_memberships_dates_check',
    );
  });

  it('keeps a category membership inside the club of its category and member', async () => {
    const club = await createClub(db);
    const otherClub = await createClub(db);
    const membership = (categoryId: string, clubMembershipId: string) =>
      db.categoryMembership.create({
        data: {
          clubId: club.id,
          categoryId,
          clubMembershipId,
          isPlayer: true,
          startsOn: new Date('2026-03-01'),
        },
      });

    await expectViolation(
      membership((await createCategory(db, club)).id, (await createMember(db, otherClub)).id),
      'category_memberships_club_membership_id_club_id_fkey',
    );
    await expectViolation(
      membership((await createCategory(db, otherClub)).id, (await createMember(db, club)).id),
      'category_memberships_category_id_club_id_fkey',
    );
  });

  it('never moves a row to another club', async () => {
    const club = await createClub(db);
    const otherClub = await createClub(db);
    const category = await createCategory(db, club);
    const member = await createMember(db, club);

    await expect(
      db.category.update({ where: { id: category.id }, data: { clubId: otherClub.id } }),
    ).rejects.toThrow('club_id cannot change on categories');
    await expect(
      db.clubMembership.update({ where: { id: member.id }, data: { clubId: otherClub.id } }),
    ).rejects.toThrow('club_id cannot change on club_memberships');
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
    const member = await createMember(db, club);
    await expectViolation(
      db.$executeRaw`UPDATE club_memberships SET secondary_positions = NULL WHERE id = ${member.id}::uuid`,
      'club_memberships_secondary_positions_check',
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
