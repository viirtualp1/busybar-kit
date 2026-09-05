import { BACK } from '../device';
import { Bitmap } from '../preview/png';
import {
  autoContrast,
  ditherToShades,
  SHADES,
  toGreyTile,
  type RgbaImage,
} from './dither';

export * from './dither';

export type PanelImageOptions = {
  /** Square side in pixels; the panel's own height by default. */
  size?: number;
  /** Stretch the histogram first. On by default: 16 levels is not many. */
  contrast?: boolean;
  shades?: number;
};

/**
 * A picture, ready for the back panel: square, grey, dithered to the levels the
 * device can show. `toPng()` on the result is what `AssetsUpload` wants.
 *
 * Decoding is deliberately not here — JPEG and PNG decoders are a dependency,
 * and which one an app pays for is the app's business. Hand this the pixels.
 */
export function ditherToPanel(image: RgbaImage, options: PanelImageOptions = {}): Bitmap {
  const size = options.size ?? BACK.height;
  const tile = toGreyTile(image, size);
  const levelled = options.contrast === false ? tile : autoContrast(tile);
  const shades = ditherToShades(levelled, options.shades ?? SHADES);
  const bitmap = new Bitmap(size, size);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const value = shades[y * size + x] ?? 0;
      bitmap.set(x, y, { r: value, g: value, b: value, a: 255 });
    }
  }

  return bitmap;
}
