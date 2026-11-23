import { CreateBucketCommand, DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

import { createS3Client, type S3Settings } from '../../src/modules/media/s3-object-storage.js';

export const STORAGE_IMAGE = 'chrislusf/seaweedfs:4.54';
export const STORAGE_PORT = 8333;

export const testStorageSettings = (endpoint: string): S3Settings => ({
  endpoint,
  region: 'auto',
  bucket: 'test-media',
  accessKeyId: 'test-storage',
  secretAccessKey: 'test-storage-secret',
});

const READY_TIMEOUT_MS = 30_000;
const RETRY_MS = 250;

const WARM_UP_KEY = 'warm-up';

// SeaweedFS opens its port before the S3 gateway can serve, so retry until the bucket exists. Its
// first write then waits several seconds for volumes, so write once here instead of in a test.
export async function prepareTestStorage(settings: S3Settings): Promise<void> {
  const client = createS3Client(settings);
  const Bucket = settings.bucket;
  const deadline = Date.now() + READY_TIMEOUT_MS;
  try {
    for (;;) {
      try {
        await client.send(new CreateBucketCommand({ Bucket }));
        break;
      } catch (error) {
        if (Date.now() > deadline) throw error;
        await new Promise((resolve) => setTimeout(resolve, RETRY_MS));
      }
    }
    await client.send(new PutObjectCommand({ Bucket, Key: WARM_UP_KEY, Body: 'ready' }));
    await client.send(new DeleteObjectCommand({ Bucket, Key: WARM_UP_KEY }));
  } finally {
    client.destroy();
  }
}
