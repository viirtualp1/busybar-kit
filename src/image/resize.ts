import type { RgbaImage } from './dither';

const TO_LINEAR = buildLinearTable();
const TO_SRGB = buildSrgbTable();

/**
 * Centre-crops to a square and box-filters down to `size`, in colour.
 *
 * The grey path next door does the same walk and throws the channels away at
 * the end; a panel that can show colour wants them kept. Averaging happens in
 * linear light for the same reason it does there — averaging gamma-encoded
 * bytes is why a downscaled picture usually comes out muddier than the
 * original. Alpha is averaged as-is, being linear already.
 */
export function toRgbaTile(image: RgbaImage, size: number): RgbaImage {
  const side = Math.min(image.width, image.height);
  const offsetX = Math.floor((image.width - side) / 2);
  const offsetY = Math.floor((image.height - side) / 2);
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    const startY = Math.floor((y * side) / size);
    const endY = Math.max(startY + 1, Math.floor(((y + 1) * side) / size));

    for (let x = 0; x < size; x += 1) {
      const startX = Math.floor((x * side) / size);
      const endX = Math.max(startX + 1, Math.floor(((x + 1) * side) / size));
      const pixel = boxAverage(
        image,
        offsetX + startX,
        offsetY + startY,
        offsetX + endX,
        offsetY + endY,
      );
      data.set(pixel, (y * size + x) * 4);
    }
  }

  return { width: size, height: size, data };
}

function boxAverage(
  image: RgbaImage,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): [number, number, number, number] {
  let red = 0;
  let green = 0;
  let blue = 0;
  let alpha = 0;
  let count = 0;

  for (let y = startY; y < endY; y += 1) {
    if (y < 0 || y >= image.height) {
      continue;
    }

    for (let x = startX; x < endX; x += 1) {
      if (x < 0 || x >= image.width) {
        continue;
      }
      const offset = (y * image.width + x) * 4;
      red += TO_LINEAR[image.data[offset] ?? 0] ?? 0;
      green += TO_LINEAR[image.data[offset + 1] ?? 0] ?? 0;
      blue += TO_LINEAR[image.data[offset + 2] ?? 0] ?? 0;
      alpha += image.data[offset + 3] ?? 0;
      count += 1;
    }
  }

  if (count === 0) {
    return [0, 0, 0, 0];
  }

  return [
    encode(red / count),
    encode(green / count),
    encode(blue / count),
    Math.round(alpha / count),
  ];
}

function encode(linear: number): number {
  return TO_SRGB[Math.max(0, Math.min(4095, Math.round(linear * 4095)))] ?? 0;
}

function buildLinearTable(): Float64Array {
  const table = new Float64Array(256);
  for (let value = 0; value < 256; value += 1) {
    const channel = value / 255;
    table[value] =
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  }

  return table;
}

/** The inverse, at 12 bits — enough that rounding never costs a visible level. */
function buildSrgbTable(): Uint8Array {
  const table = new Uint8Array(4096);
  for (let step = 0; step < 4096; step += 1) {
    const linear = step / 4095;
    const encoded =
      linear <= 0.0031308 ? linear * 12.92 : 1.055 * linear ** (1 / 2.4) - 0.055;
    table[step] = Math.round(Math.max(0, Math.min(1, encoded)) * 255);
  }

  return table;
}
