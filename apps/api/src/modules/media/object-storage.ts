export interface UploadSlot {
  key: string;
  contentType: string;
  sizeBytes: number;
  expiresInSeconds: number;
}

export interface PresignedUpload {
  url: string;
  method: 'PUT';
  headers: Record<string, string>;
}

export interface StoredObject {
  body: Buffer;
  contentType: string | undefined;
}

export type ReadResult =
  { status: 'found'; object: StoredObject } | { status: 'missing' } | { status: 'too_large' };

export abstract class ObjectStorage {
  abstract presignUpload(slot: UploadSlot): Promise<PresignedUpload>;
  abstract presignDownload(key: string, expiresInSeconds: number): Promise<string>;
  abstract read(key: string, maxBytes: number): Promise<ReadResult>;
  abstract write(key: string, body: Uint8Array, contentType: string): Promise<void>;
  abstract delete(keys: readonly string[]): Promise<void>;
}
