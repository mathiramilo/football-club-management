import { clubCrestCreateUpload, clubCrestSet, type ClubSummary } from '@repo/api-client';
import { CLUB_CREST_MAX_BYTES } from '@repo/contracts';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

export interface PreparedCrest {
  uri: string;
  blob: Blob;
}

export type PickedCrest =
  { status: 'picked'; crest: PreparedCrest } | { status: 'cancelled' } | { status: 'unreadable' };

const sizes = [512, 384, 256];

async function resizedCrest(uri: string, width: number, height: number) {
  const longest = Math.max(width, height);
  for (const size of sizes) {
    const scale = Math.min(size, longest) / longest;
    const image = await ImageManipulator.manipulate(uri)
      .resize({ width: Math.round(width * scale), height: Math.round(height * scale) })
      .renderAsync();
    const saved = await image.saveAsync({ compress: 0.9, format: SaveFormat.WEBP });
    const blob = await (await fetch(saved.uri)).blob();
    if (blob.size <= CLUB_CREST_MAX_BYTES) return { uri: saved.uri, blob };
  }
  return null;
}

export async function pickCrest(): Promise<PickedCrest> {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    const asset = result.assets?.[0];
    if (result.canceled || !asset) return { status: 'cancelled' };
    const crest = await resizedCrest(asset.uri, asset.width, asset.height);
    return crest ? { status: 'picked', crest } : { status: 'unreadable' };
  } catch {
    return { status: 'unreadable' };
  }
}

export async function uploadClubCrest(clubId: string, crest: Blob): Promise<ClubSummary> {
  const upload = await clubCrestCreateUpload(clubId, {
    purpose: 'club_crest',
    mimeType: 'image/webp',
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
