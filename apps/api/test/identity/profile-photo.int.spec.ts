import type { INestApplication } from '@nestjs/common';
import type { ProfilePhotoUploadResponse, ProfileResponse } from '@repo/contracts';
import sharp from 'sharp';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { PrismaService } from '../../src/core/database/prisma.service.js';
import { ObjectStorage } from '../../src/modules/media/object-storage.js';
import { as, type CastMember, signInAs } from '../support/club-cast.js';
import { createTestApp } from '../support/create-test-app.js';
import { createUser } from '../support/factories.js';

const MAX_BYTES = 300 * 1024;

const jpeg = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: '#1f6feb' } })
    .jpeg()
    .withMetadata({ exif: { IFD0: { Artist: 'Ficticio' } } })
    .toBuffer();

const dimensionsOf = async (url: string) => {
  const response = await fetch(url);
  expect(response.status).toBe(200);
  const { width, height, format, exif } = await sharp(
    Buffer.from(await response.arrayBuffer()),
  ).metadata();
  return { width, height, format, exif };
};

describe('/v1/me/photo (AUTH-05)', () => {
  let app: INestApplication<App>;
  let db: PrismaService;
  let storage: ObjectStorage;
  let player: CastMember;

  const signedInUser = async () => {
    const user = await createUser(db);
    return { userId: user.id, clubMembershipId: '', token: await signInAs(db, user.id) };
  };
  const requestUpload = (actor: CastMember, body: object) =>
    as(app, actor).post('/v1/me/photo/uploads').send(body);
  const uploadPhoto = async (actor: CastMember, file: Buffer, mimeType = 'image/jpeg') => {
    const response = await requestUpload(actor, { mimeType, sizeBytes: file.length }).expect(201);
    const slot = response.body as ProfilePhotoUploadResponse;
    const upload = await fetch(slot.url, {
      method: slot.method,
      headers: slot.headers,
      body: file,
    });
    expect(upload.status).toBe(200);
    return slot.uploadKey;
  };
  const setPhoto = (actor: CastMember, uploadKey: string) =>
    as(app, actor).put('/v1/me/photo').send({ uploadKey });
  const photoKeyOf = async (userId: string) =>
    (await db.user.findUniqueOrThrow({ where: { id: userId } })).photoKey;
  const storedVariants = (photoKey: string) =>
    Promise.all(
      ['512', '128'].map(
        async (size) => (await storage.read(`${photoKey}/${size}.webp`, MAX_BYTES)).status,
      ),
    );

  beforeAll(async () => {
    app = await createTestApp();
    db = app.get(PrismaService);
    storage = app.get(ObjectStorage);
  });

  beforeEach(async () => {
    player = await signedInUser();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /v1/me/photo/uploads', () => {
    it('returns a presigned upload that expires in 10 minutes', async () => {
      const before = Date.now();

      const response = await requestUpload(player, { mimeType: 'image/jpeg', sizeBytes: 1000 });

      expect(response.status).toBe(201);
      const slot = response.body as ProfilePhotoUploadResponse;
      expect(slot).toMatchObject({
        uploadKey: expect.stringMatching(
          new RegExp(`^uploads/profile-photos/${player.userId}/`),
        ) as string,
        method: 'PUT',
        headers: { 'Content-Type': 'image/jpeg' },
      });
      expect(Date.parse(slot.expiresAt) - before).toBeGreaterThanOrEqual(10 * 60 * 1000 - 1000);
    });

    it.each([
      ['a file over 300 KB', { mimeType: 'image/jpeg', sizeBytes: MAX_BYTES + 1 }],
      ['an empty file', { mimeType: 'image/jpeg', sizeBytes: 0 }],
      ['a type that is not an image', { mimeType: 'application/pdf', sizeBytes: 1000 }],
      ['an image type it does not accept', { mimeType: 'image/heic', sizeBytes: 1000 }],
    ])('answers 400 VALIDATION_FAILED for %s', async (_case, body) => {
      const response = await requestUpload(player, body);

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({ code: 'VALIDATION_FAILED' });
    });

    it('answers 401 without a session', async () => {
      const response = await as(app, null)
        .post('/v1/me/photo/uploads')
        .send({ mimeType: 'image/jpeg', sizeBytes: 1000 });

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /v1/me/photo', () => {
    it('re-encodes the upload into square WebP photos without metadata, and serves them signed', async () => {
      const uploadKey = await uploadPhoto(player, await jpeg(900, 600));

      const response = await setPhoto(player, uploadKey);

      expect(response.status).toBe(200);
      const { photo } = response.body as ProfileResponse;
      expect(photo).not.toBeNull();
      expect(await dimensionsOf(photo?.url ?? '')).toEqual({
        width: 512,
        height: 512,
        format: 'webp',
        exif: undefined,
      });
      expect(await dimensionsOf(photo?.thumbnailUrl ?? '')).toMatchObject({
        width: 128,
        height: 128,
      });
      expect(await storage.read(uploadKey, MAX_BYTES)).toEqual({ status: 'missing' });
    });

    it('returns the photo with the profile afterwards', async () => {
      await setPhoto(player, await uploadPhoto(player, await jpeg(400, 400))).expect(200);

      const response = await as(app, player).get('/v1/me').expect(200);

      expect((response.body as ProfileResponse).photo).toMatchObject({
        id: expect.any(String) as string,
        url: expect.stringContaining('X-Amz-Signature=') as string,
      });
    });

    it('accepts PNG and WebP too', async () => {
      const png = await sharp(await jpeg(300, 300))
        .png()
        .toBuffer();
      const webp = await sharp(await jpeg(300, 300))
        .webp()
        .toBuffer();

      await setPhoto(player, await uploadPhoto(player, png, 'image/png')).expect(200);
      await setPhoto(player, await uploadPhoto(player, webp, 'image/webp')).expect(200);
    });

    it('replaces the previous photo and deletes its files', async () => {
      await setPhoto(player, await uploadPhoto(player, await jpeg(400, 400))).expect(200);
      const first = await photoKeyOf(player.userId);

      await setPhoto(player, await uploadPhoto(player, await jpeg(500, 500))).expect(200);

      const second = await photoKeyOf(player.userId);
      expect(second).not.toBe(first);
      expect(await storedVariants(first ?? '')).toEqual(['missing', 'missing']);
      expect(await storedVariants(second ?? '')).toEqual(['found', 'found']);
    });

    it('answers 422 UPLOAD_INVALID for a file that is not an image, and deletes it', async () => {
      const notAnImage = Buffer.from('%PDF-1.7 not really a photo');
      const uploadKey = await uploadPhoto(player, notAnImage);

      const response = await setPhoto(player, uploadKey);

      expect(response.status).toBe(422);
      expect(response.body).toMatchObject({ code: 'UPLOAD_INVALID' });
      expect(await storage.read(uploadKey, MAX_BYTES)).toEqual({ status: 'missing' });
      expect(await photoKeyOf(player.userId)).toBeNull();
    });

    it('answers 422 UPLOAD_INVALID for an image format it does not accept', async () => {
      const gif = await sharp(await jpeg(64, 64))
        .gif()
        .toBuffer();

      const response = await setPhoto(player, await uploadPhoto(player, gif));

      expect(response.status).toBe(422);
      expect(response.body).toMatchObject({ code: 'UPLOAD_INVALID' });
    });

    it('answers 404 UPLOAD_NOT_FOUND before the file is uploaded', async () => {
      const response = await requestUpload(player, { mimeType: 'image/jpeg', sizeBytes: 1000 });

      const confirmed = await setPhoto(
        player,
        (response.body as ProfilePhotoUploadResponse).uploadKey,
      );

      expect(confirmed.status).toBe(404);
      expect(confirmed.body).toMatchObject({ code: 'UPLOAD_NOT_FOUND' });
    });

    it('answers 404 UPLOAD_NOT_FOUND for another user’s upload, and leaves it alone', async () => {
      const other = await signedInUser();
      const uploadKey = await uploadPhoto(other, await jpeg(400, 400));

      const response = await setPhoto(player, uploadKey);

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({ code: 'UPLOAD_NOT_FOUND' });
      expect((await storage.read(uploadKey, MAX_BYTES)).status).toBe('found');
      expect(await photoKeyOf(player.userId)).toBeNull();
    });

    it.each([
      ['a key outside the uploads', (userId: string) => `profile-photos/${userId}/x`],
      [
        'a key that walks up the path',
        (userId: string) => `uploads/profile-photos/${userId}/../other`,
      ],
    ])('answers 404 UPLOAD_NOT_FOUND for %s', async (_case, keyFor) => {
      const response = await setPhoto(player, keyFor(player.userId));

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({ code: 'UPLOAD_NOT_FOUND' });
    });
  });

  describe('DELETE /v1/me/photo', () => {
    it('removes the photo and its files', async () => {
      await setPhoto(player, await uploadPhoto(player, await jpeg(400, 400))).expect(200);
      const photoKey = await photoKeyOf(player.userId);

      const response = await as(app, player).delete('/v1/me/photo');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ photo: null });
      expect(await photoKeyOf(player.userId)).toBeNull();
      expect(await storedVariants(photoKey ?? '')).toEqual(['missing', 'missing']);
    });

    it('does nothing without a photo', async () => {
      const response = await as(app, player).delete('/v1/me/photo');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ photo: null });
    });
  });
});
