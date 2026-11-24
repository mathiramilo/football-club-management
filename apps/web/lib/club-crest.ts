import { clubCrestCreateUpload, clubCrestSet, type ClubSummary } from '@repo/api-client';
import { CLUB_CREST_MAX_BYTES } from '@repo/contracts';

const sizes = [512, 384, 256];

export const acceptedCrestTypes = 'image/jpeg,image/png,image/webp,image/heic,image/heif';

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

const encode = (canvas: HTMLCanvasElement, type: string) =>
  new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, type, 0.9);
  });

async function transparentBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  const webp = await encode(canvas, 'image/webp');
  if (webp?.type === 'image/webp') return webp;
  return encode(canvas, 'image/png');
}

export async function squareCrest(file: Blob): Promise<Blob | null> {
  try {
    const image = await loadImage(file);
    const longest = Math.max(image.naturalWidth, image.naturalHeight);
    for (const size of sizes) {
      const side = Math.min(size, longest);
      const scale = side / longest;
      const width = image.naturalWidth * scale;
      const height = image.naturalHeight * scale;
      const canvas = document.createElement('canvas');
      canvas.width = side;
      canvas.height = side;
      canvas
        .getContext('2d')
        ?.drawImage(image, (side - width) / 2, (side - height) / 2, width, height);
      const blob = await transparentBlob(canvas);
      if (blob && blob.size <= CLUB_CREST_MAX_BYTES) return blob;
    }
    return null;
  } catch {
    return null;
  }
}

export async function uploadClubCrest(clubId: string, crest: Blob): Promise<ClubSummary> {
  const upload = await clubCrestCreateUpload(clubId, {
    purpose: 'club_crest',
    mimeType: crest.type === 'image/webp' ? 'image/webp' : 'image/png',
    sizeBytes: crest.size,
  });
  const response = await fetch(upload.url, {
    method: upload.method,
    headers: upload.headers,
    body: crest,
  });
  if (!response.ok) throw new Error(`Crest upload failed with ${String(response.status)}`);
  return clubCrestSet(clubId, { uploadKey: upload.uploadKey });
}
