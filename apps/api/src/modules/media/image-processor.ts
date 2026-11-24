import { Injectable } from '@nestjs/common';
import sharp from 'sharp';

export interface ImageVariant {
  size: number;
  body: Buffer;
}

export type SquareVariantsResult =
  { status: 'processed'; variants: ImageVariant[] } | { status: 'invalid' };

const ACCEPTED_FORMATS = new Set(['jpeg', 'png', 'webp']);
const MAX_INPUT_PIXELS = 40_000_000;
const WEBP_QUALITY = 80;
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

export type SquareFit = 'cover' | 'contain';

// NFR-SEC-08: every image is decoded and re-encoded, so only pixels reach storage: no metadata,
// no location, nothing that isn't an image.
@Injectable()
export class ImageProcessor {
  async squareWebpVariants(
    input: Buffer,
    sizes: readonly number[],
    fit: SquareFit,
  ): Promise<SquareVariantsResult> {
    const options = { limitInputPixels: MAX_INPUT_PIXELS, failOn: 'error' } as const;
    try {
      const { format } = await sharp(input, options).metadata();
      if (!ACCEPTED_FORMATS.has(format)) return { status: 'invalid' };
      const variants = await Promise.all(
        sizes.map(async (size) => ({
          size,
          body: await sharp(input, options)
            .rotate()
            .resize(size, size, { fit, background: TRANSPARENT })
            .webp({ quality: WEBP_QUALITY })
            .toBuffer(),
        })),
      );
      return { status: 'processed', variants };
    } catch {
      return { status: 'invalid' };
    }
  }
}
