import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '../../core/config/env.js';
import { ImageProcessor } from './image-processor.js';
import { ObjectStorage } from './object-storage.js';
import { createS3Client, S3ObjectStorage } from './s3-object-storage.js';

@Module({
  providers: [
    ImageProcessor,
    {
      provide: ObjectStorage,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): ObjectStorage => {
        const get = <Key extends keyof Env>(key: Key) => config.get(key, { infer: true });
        const settings = {
          endpoint: get('STORAGE_ENDPOINT'),
          region: get('STORAGE_REGION'),
          bucket: get('STORAGE_BUCKET'),
          accessKeyId: get('STORAGE_ACCESS_KEY_ID'),
          secretAccessKey: get('STORAGE_SECRET_ACCESS_KEY'),
        };
        return new S3ObjectStorage(createS3Client(settings), settings.bucket);
      },
    },
  ],
  exports: [ImageProcessor, ObjectStorage],
})
export class MediaModule {}
