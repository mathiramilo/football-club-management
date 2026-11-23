import { randomUUID } from 'node:crypto';

import type { INestApplication } from '@nestjs/common';
import type { ClubSummary, ClubUploadResponse, MyClubsResponse } from '@repo/contracts';
import sharp from 'sharp';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { PrismaService } from '../../src/core/database/prisma.service.js';
import { ObjectStorage } from '../../src/modules/media/object-storage.js';
import {
  as,
  type Cast,
  type CastActor,
  type CastMember,
  createCast,
} from '../support/club-cast.js';
import { createTestApp } from '../support/create-test-app.js';

const MAX_BYTES = 500 * 1024;

const transparentPng = (size: number) =>
  sharp({ create: { width: size, height: size, channels: 4, background: '#1d4ed880' } })
    .png()
    .toBuffer();

const imageAt = async (url: string) => {
  const response = await fetch(url);
  expect(response.status).toBe(200);
  const { width, height, format, hasAlpha } = await sharp(
    Buffer.from(await response.arrayBuffer()),
  ).metadata();
  return { width, height, format, hasAlpha };
};

describe('club crest (CLUB-01, BR-CLUB-01)', () => {
  let app: INestApplication<App>;
  let db: PrismaService;
  let storage: ObjectStorage;
  let cast: Cast;

  const uploadsPath = (clubId: string) => `/v1/clubs/${clubId}/uploads`;
  const crestPath = (clubId: string) => `/v1/clubs/${clubId}/crest`;
  const requestUpload = (actor: CastMember | null, clubId: string, body: object) =>
    as(app, actor).post(uploadsPath(clubId)).send(body);
  const uploadCrest = async (actor: CastMember, clubId: string, file: Buffer, mimeType: string) => {
    const response = await requestUpload(actor, clubId, {
      purpose: 'club_crest',
      mimeType,
      sizeBytes: file.length,
    }).expect(201);
    const slot = response.body as ClubUploadResponse;
    const upload = await fetch(slot.url, {
      method: slot.method,
      headers: slot.headers,
      body: file,
    });
    expect(upload.status).toBe(200);
    return slot.uploadKey;
  };
  const setCrest = (actor: CastMember | null, clubId: string, uploadKey: string) =>
    as(app, actor).put(crestPath(clubId)).send({ uploadKey });
  const crestKeyOf = async (clubId: string) =>
    (await db.club.findUniqueOrThrow({ where: { id: clubId } })).crestKey;
  const storedVariants = (crestKey: string) =>
    Promise.all(
      ['512', '128'].map(
        async (size) => (await storage.read(`${crestKey}/${size}.webp`, MAX_BYTES)).status,
      ),
    );
  const crestOfClub = async (owner: CastMember) => {
    const key = await uploadCrest(owner, cast.club.id, await transparentPng(600), 'image/png');
    await setCrest(owner, cast.club.id, key).expect(200);
    const crestKey = await crestKeyOf(cast.club.id);
    if (!crestKey) throw new Error('The crest was not stored');
    return crestKey;
  };

  beforeAll(async () => {
    app = await createTestApp();
    db = app.get(PrismaService);
    storage = app.get(ObjectStorage);
  });

  beforeEach(async () => {
    cast = await createCast(db);
  });

  afterAll(async () => {
    await app.close();
  });

  const allowed: CastActor[] = ['owner', 'adminOnly'];
  const forbidden: CastActor[] = [
    'dtOfCategory',
    'coachOfCategory',
    'player',
    'playerCoach',
    'dtOfOtherCategory',
    'formerPlayer',
  ];
  const outsiders: CastActor[] = ['removedMember', 'otherClubMember'];
  const crestUpload = { purpose: 'club_crest', mimeType: 'image/png', sizeBytes: 1000 };

  describe('POST /v1/clubs/:clubId/uploads', () => {
    it.each(allowed)('gives the %s a presigned upload for the crest', async (actor) => {
      const response = await requestUpload(cast.actors[actor], cast.club.id, crestUpload);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        uploadKey: expect.stringMatching(
          new RegExp(`^uploads/club-crests/${cast.club.id}/`),
        ) as string,
        method: 'PUT',
        headers: { 'Content-Type': 'image/png' },
      });
    });

    it.each(forbidden)('answers 403 to the %s', async (actor) => {
      const response = await requestUpload(cast.actors[actor], cast.club.id, crestUpload);

      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({ code: 'FORBIDDEN' });
    });

    it.each(outsiders)('answers 404 to the %s', async (actor) => {
      await requestUpload(cast.actors[actor], cast.club.id, crestUpload).expect(404);
    });

    it('answers 404 for a club that does not exist', async () => {
      await requestUpload(cast.actors.owner, randomUUID(), crestUpload).expect(404);
    });

    it('answers 401 without a session', async () => {
      await requestUpload(null, cast.club.id, crestUpload).expect(401);
    });

    it.each([
      ['a crest over 500 KB', { ...crestUpload, sizeBytes: MAX_BYTES + 1 }],
      ['an empty file', { ...crestUpload, sizeBytes: 0 }],
      ['an image type it does not accept', { ...crestUpload, mimeType: 'image/svg+xml' }],
      ['an unknown purpose', { ...crestUpload, purpose: 'exercise_video' }],
      ['no purpose', { mimeType: 'image/png', sizeBytes: 1000 }],
    ])('answers 400 VALIDATION_FAILED for %s', async (_case, body) => {
      const response = await requestUpload(cast.actors.owner, cast.club.id, body).expect(400);

      expect(response.body).toMatchObject({ code: 'VALIDATION_FAILED' });
    });
  });

  describe('PUT /v1/clubs/:clubId/crest', () => {
    it('re-encodes the upload into square WebP, keeps transparency and serves it signed', async () => {
      const { owner } = cast.actors;
      const uploadKey = await uploadCrest(
        owner,
        cast.club.id,
        await transparentPng(600),
        'image/png',
      );

      const response = await setCrest(owner, cast.club.id, uploadKey).expect(200);

      const { crest } = response.body as ClubSummary;
      expect(response.body).toMatchObject({ id: cast.club.id, name: cast.club.name });
      expect(await imageAt(crest?.url ?? '')).toEqual({
        width: 512,
        height: 512,
        format: 'webp',
        hasAlpha: true,
      });
      expect(await imageAt(crest?.thumbnailUrl ?? '')).toMatchObject({ width: 128, height: 128 });
      expect(await storage.read(uploadKey, MAX_BYTES)).toEqual({ status: 'missing' });
    });

    it('shows the crest to every member in their club list', async () => {
      const crestKey = await crestOfClub(cast.actors.owner);

      const response = await as(app, cast.actors.player).get('/v1/me/clubs').expect(200);

      const [entry] = (response.body as MyClubsResponse).items;
      expect(entry?.club.crest?.id).toBe(crestKey.slice(crestKey.lastIndexOf('/') + 1));
      expect(await imageAt(entry?.club.crest?.thumbnailUrl ?? '')).toMatchObject({ width: 128 });
    });

    it('deletes the previous crest when it is replaced', async () => {
      const { adminOnly } = cast.actors;
      const previous = await crestOfClub(cast.actors.owner);
      const uploadKey = await uploadCrest(
        adminOnly,
        cast.club.id,
        await transparentPng(300),
        'image/png',
      );

      await setCrest(adminOnly, cast.club.id, uploadKey).expect(200);

      expect(await storedVariants(previous)).toEqual(['missing', 'missing']);
      expect(await crestKeyOf(cast.club.id)).not.toBe(previous);
    });

    it("answers 404 UPLOAD_NOT_FOUND for another club's upload", async () => {
      const otherOwner = cast.actors.otherClubMember;
      const uploadKey = await uploadCrest(
        otherOwner,
        cast.otherClub.id,
        await transparentPng(200),
        'image/png',
      );

      const response = await setCrest(cast.actors.owner, cast.club.id, uploadKey).expect(404);

      expect(response.body).toMatchObject({ code: 'UPLOAD_NOT_FOUND' });
      expect(await crestKeyOf(cast.club.id)).toBeNull();
    });

    it('answers 404 UPLOAD_NOT_FOUND for an upload that never finished', async () => {
      const slot = await requestUpload(cast.actors.owner, cast.club.id, crestUpload).expect(201);

      const response = await setCrest(
        cast.actors.owner,
        cast.club.id,
        (slot.body as ClubUploadResponse).uploadKey,
      ).expect(404);

      expect(response.body).toMatchObject({ code: 'UPLOAD_NOT_FOUND' });
    });

    it('answers 422 UPLOAD_INVALID for a file that is not an image', async () => {
      const file = Buffer.from('%PDF-1.7 not an image');
      const uploadKey = await uploadCrest(cast.actors.owner, cast.club.id, file, 'image/png');

      const response = await setCrest(cast.actors.owner, cast.club.id, uploadKey).expect(422);

      expect(response.body).toMatchObject({ code: 'UPLOAD_INVALID' });
      expect(await crestKeyOf(cast.club.id)).toBeNull();
    });

    it.each(forbidden)('answers 403 to the %s', async (actor) => {
      const uploadKey = `uploads/club-crests/${cast.club.id}/${randomUUID()}`;

      await setCrest(cast.actors[actor], cast.club.id, uploadKey).expect(403);
    });

    it.each(outsiders)('answers 404 to the %s', async (actor) => {
      const uploadKey = `uploads/club-crests/${cast.club.id}/${randomUUID()}`;

      await setCrest(cast.actors[actor], cast.club.id, uploadKey).expect(404);
    });
  });

  describe('DELETE /v1/clubs/:clubId/crest', () => {
    it('removes the crest and its images', async () => {
      const crestKey = await crestOfClub(cast.actors.owner);

      const response = await as(app, cast.actors.adminOnly).delete(crestPath(cast.club.id));

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ id: cast.club.id, crest: null });
      expect(await crestKeyOf(cast.club.id)).toBeNull();
      expect(await storedVariants(crestKey)).toEqual(['missing', 'missing']);
    });

    it('answers 200 when there is no crest', async () => {
      await as(app, cast.actors.owner).delete(crestPath(cast.club.id)).expect(200);
    });

    it.each(forbidden)('answers 403 to the %s and keeps the crest', async (actor) => {
      const crestKey = await crestOfClub(cast.actors.owner);

      await as(app, cast.actors[actor]).delete(crestPath(cast.club.id)).expect(403);

      expect(await crestKeyOf(cast.club.id)).toBe(crestKey);
    });

    it.each(outsiders)('answers 404 to the %s and keeps the crest', async (actor) => {
      const crestKey = await crestOfClub(cast.actors.owner);

      await as(app, cast.actors[actor]).delete(crestPath(cast.club.id)).expect(404);

      expect(await crestKeyOf(cast.club.id)).toBe(crestKey);
    });
  });
});
