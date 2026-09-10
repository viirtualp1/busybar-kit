import { BACK, FRONT } from './device';
import { Bitmap } from './preview/png';

/**
 * A photograph of a panel, as the device actually sends it.
 *
 * `GET /screen?display=0|1` is documented as `image/bmp`, and it is not: the
 * body is base64 text, and what it decodes to is raw pixels with no header of
 * any kind. Handing that to an `<img>` gets you a broken image icon, which is
 * how this came to be written down.
 *
 * The two panels are not the same picture, either:
 *
 * - **front**, 72×16, three bytes a pixel — RGB, no alpha and no padding.
 * - **back**, 160×80, half a byte a pixel — four bits of grey, high nibble
 *   first, which is the sixteen levels the panel actually has.
 */
export type Display = 0 | 1;

export const SCREEN = {
  0: { width: FRONT.width, height: FRONT.height, bytes: FRONT.width * FRONT.height * 3 },
  1: { width: BACK.width, height: BACK.height, bytes: (BACK.width * BACK.height) / 2 },
} as const satisfies Record<Display, { width: number; height: number; bytes: number }>;

/** Grey levels the back panel has, and the step between them at eight bits. */
const BACK_LEVELS = 16;
const BACK_STEP = 255 / (BACK_LEVELS - 1);

export function decodeScreenFrame(payload: string | Buffer, display: Display): Bitmap {
  const bytes = typeof payload === 'string' ? Buffer.from(payload, 'base64') : payload;
  const panel = SCREEN[display];

  if (bytes.length < panel.bytes) {
    throw new Error(
      `screen ${display} came back ${bytes.length} bytes short of the ${panel.bytes} a ${panel.width}×${panel.height} frame needs`,
    );
  }

  return display === 0 ? front(bytes) : back(bytes);
}

function front(bytes: Buffer): Bitmap {
  const { width, height } = SCREEN[0];
  const bitmap = new Bitmap(width, height);

  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const offset = pixel * 3;
    bitmap.set(pixel % width, Math.floor(pixel / width), {
      r: bytes[offset] ?? 0,
      g: bytes[offset + 1] ?? 0,
      b: bytes[offset + 2] ?? 0,
      a: 255,
    });
  }

  return bitmap;
}

function back(bytes: Buffer): Bitmap {
  const { width, height } = SCREEN[1];
  const bitmap = new Bitmap(width, height);

  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const byte = bytes[pixel >> 1] ?? 0;
    // Two pixels to a byte, the left-hand one in the high nibble.
    const level = pixel % 2 === 0 ? (byte >> 4) & 0xf : byte & 0xf;
    const value = Math.round(level * BACK_STEP);
    bitmap.set(pixel % width, Math.floor(pixel / width), {
      r: value,
      g: value,
      b: value,
      a: 255,
    });
  }

  return bitmap;
}
