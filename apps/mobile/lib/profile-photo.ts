import { profilePhotoCreateUpload, profilePhotoSet, type ProfileResponse } from '@repo/api-client';
import { PROFILE_PHOTO_MAX_BYTES } from '@repo/contracts';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

export interface PreparedPhoto {
  uri: string;
  blob: Blob;
}

export type PickedPhoto =
  { status: 'picked'; photo: PreparedPhoto } | { status: 'cancelled' } | { status: 'unreadable' };

const attempts = [
  { size: 768, quality: 0.85 },
  { size: 768, quality: 0.7 },
  { size: 512, quality: 0.8 },
  { size: 512, quality: 0.6 },
];

async function squarePhoto(uri: string, width: number, height: number) {
  const side = Math.min(width, height);
  const crop = {
    originX: Math.floor((width - side) / 2),
    originY: Math.floor((height - side) / 2),
    width: side,
    height: side,
  };
  for (const { size, quality } of attempts) {
    const output = Math.min(size, side);
    const image = await ImageManipulator.manipulate(uri)
      .crop(crop)
      .resize({ width: output, height: output })
      .renderAsync();
    const saved = await image.saveAsync({ compress: quality, format: SaveFormat.JPEG });
    const blob = await (await fetch(saved.uri)).blob();
    if (blob.size <= PROFILE_PHOTO_MAX_BYTES) return { uri: saved.uri, blob };
  }
  return null;
}

export async function pickSquarePhoto(): Promise<PickedPhoto> {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    const asset = result.assets?.[0];
    if (result.canceled || !asset) return { status: 'cancelled' };
    const photo = await squarePhoto(asset.uri, asset.width, asset.height);
    return photo ? { status: 'picked', photo } : { status: 'unreadable' };
  } catch {
    return { status: 'unreadable' };
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
