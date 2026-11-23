import { randomUUID } from 'node:crypto';

import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { ObjectStorage } from '../../src/modules/media/object-storage.js';
import { createTestApp } from '../support/create-test-app.js';

const JPEG = 'image/jpeg';
const bytes = (text: string) => new TextEncoder().encode(text);

describe('ObjectStorage on S3 (ADR-017)', () => {
  let app: INestApplication<App>;
  let storage: ObjectStorage;
  const keyFor = (name: string) => `test/${randomUUID()}/${name}`;

  const upload = async (key: string, body: Uint8Array, contentType = JPEG) => {
    const slot = await storage.presignUpload({
      key,
      contentType: JPEG,
      sizeBytes: 5,
      expiresInSeconds: 60,
    });
    return fetch(slot.url, {
      method: slot.method,
      body,
      headers: { ...slot.headers, 'Content-Type': contentType },
    });
  };

  beforeAll(async () => {
    app = await createTestApp();
    storage = app.get(ObjectStorage);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('presigned uploads', () => {
    it('accept a file of the declared type and size', async () => {
      const key = keyFor('photo.jpg');

      const response = await upload(key, bytes('hello'));

      expect(response.status).toBe(200);
      expect(await storage.read(key, 5)).toEqual({
        status: 'found',
        object: { body: Buffer.from('hello'), contentType: JPEG },
      });
    });

    it('reject a file of another size', async () => {
      const response = await upload(keyFor('photo.jpg'), bytes('hello world'));

      expect(response.status).toBe(403);
    });

    it('reject a file of another type', async () => {
      const response = await upload(keyFor('photo.jpg'), bytes('hello'), 'image/png');

      expect(response.status).toBe(403);
    });

    it('reject an upload to another key', async () => {
      const slot = await storage.presignUpload({
        key: keyFor('photo.jpg'),
        contentType: JPEG,
        sizeBytes: 5,
        expiresInSeconds: 60,
      });

      const response = await fetch(slot.url.replace('photo.jpg', 'other.jpg'), {
        method: 'PUT',
        body: bytes('hello'),
        headers: slot.headers,
      });

      expect(response.status).toBe(403);
    });
  });

  describe('presigned downloads', () => {
    it('serve the object', async () => {
      const key = keyFor('photo.webp');
      await storage.write(key, bytes('image'), 'image/webp');

      const response = await fetch(await storage.presignDownload(key, 60));

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('image/webp');
      expect(await response.text()).toBe('image');
    });

    it('refuse a tampered signature', async () => {
      const key = keyFor('photo.webp');
      await storage.write(key, bytes('image'), 'image/webp');
      const url = new URL(await storage.presignDownload(key, 60));
      url.searchParams.set('X-Amz-Signature', '0'.repeat(64));

      const response = await fetch(url);

      expect(response.status).toBe(403);
    });
  });

  describe('read', () => {
    it('reports a missing object', async () => {
      expect(await storage.read(keyFor('nothing.jpg'), 100)).toEqual({ status: 'missing' });
    });

    it('refuses an object over the size limit without downloading it', async () => {
      const key = keyFor('big.jpg');
      await storage.write(key, bytes('123456'), JPEG);

      expect(await storage.read(key, 5)).toEqual({ status: 'too_large' });
    });
  });

  describe('delete', () => {
    it('removes every key, and ignores keys that do not exist', async () => {
      const keys = [keyFor('a.webp'), keyFor('b.webp')];
      await Promise.all(keys.map((key) => storage.write(key, bytes('x'), 'image/webp')));

      await storage.delete([...keys, keyFor('missing.webp')]);

      for (const key of keys) expect(await storage.read(key, 10)).toEqual({ status: 'missing' });
    });

    it('does nothing for no keys', async () => {
      await expect(storage.delete([])).resolves.toBeUndefined();
    });
  });
});
