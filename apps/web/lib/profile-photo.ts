import { profilePhotoCreateUpload, profilePhotoSet, type ProfileResponse } from '@repo/api-client';
import { PROFILE_PHOTO_MAX_BYTES } from '@repo/contracts';

const attempts = [
  { size: 768, quality: 0.85 },
  { size: 768, quality: 0.7 },
  { size: 512, quality: 0.8 },
  { size: 512, quality: 0.6 },
];

export const acceptedPhotoTypes = 'image/jpeg,image/png,image/webp,image/heic,image/heif';

async function loadImage(file: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

const toJpeg = (canvas: HTMLCanvasElement, quality: number) =>
  new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', quality);
  });

export async function squarePhoto(file: Blob): Promise<Blob | null> {
  try {
    const image = await loadImage(file);
    const side = Math.min(image.naturalWidth, image.naturalHeight);
    const left = (image.naturalWidth - side) / 2;
    const top = (image.naturalHeight - side) / 2;
    for (const { size, quality } of attempts) {
      const output = Math.min(size, side);
      const canvas = document.createElement('canvas');
      canvas.width = output;
      canvas.height = output;
      canvas.getContext('2d')?.drawImage(image, left, top, side, side, 0, 0, output, output);
      const blob = await toJpeg(canvas, quality);
      if (blob && blob.size <= PROFILE_PHOTO_MAX_BYTES) return blob;
    }
    return null;
  } catch {
    return null;
  }
}

export async function uploadProfilePhoto(photo: Blob): Promise<ProfileResponse> {
  const upload = await profilePhotoCreateUpload({ mimeType: 'image/jpeg', sizeBytes: photo.size });
  const response = await fetch(upload.url, {
    method: upload.method,
    headers: upload.headers,
    body: photo,
  });
  if (!response.ok) throw new Error(`Photo upload failed with ${String(response.status)}`);
  return profilePhotoSet({ uploadKey: upload.uploadKey });
}
