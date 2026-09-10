import { BACK, FRONT } from '../device';
import type { AnyElement } from '../elements';
import { toShade } from '../image/dither';
import { GLYPH_HEIGHT, GLYPH_WIDTH, glyph, glyphTextWidth } from './font';
import { Bitmap, parseColor, type Rgba } from './png';

export type { AnyElement };

const OFF_PIXEL: Rgba = { r: 10, g: 10, b: 12, a: 255 };

export function renderFront(elements: AnyElement[]): Bitmap {
  return render(elements, 'front', FRONT.width, FRONT.height, false);
}

export function renderBack(elements: AnyElement[]): Bitmap {
  return render(elements, 'back', BACK.width, BACK.height, true);
}

/**
 * Draws onto a panel that already has something on it.
 *
 * The device layers elements in the order they arrive, and an app that puts a
 * picture under an outline needs the preview to agree. `renderFront` cannot,
 * having made the bitmap itself; this can.
 */
export function renderOnto(
  bitmap: Bitmap,
  elements: AnyElement[],
  display: 'front' | 'back',
): Bitmap {
  return paintAll(bitmap, elements, display, display === 'back');
}

function render(
  elements: AnyElement[],
  display: 'front' | 'back',
  width: number,
  height: number,
  greyscale: boolean,
): Bitmap {
  return paintAll(
    new Bitmap(width, height, shade(OFF_PIXEL, greyscale)),
    elements,
    display,
    greyscale,
  );
}

function paintAll(
  bitmap: Bitmap,
  elements: AnyElement[],
  display: 'front' | 'back',
  greyscale: boolean,
): Bitmap {
  for (const element of elements) {
    if (element.display !== display) {
      continue;
    }

    if (element.type === 'rectangle') {
      drawRectangle(bitmap, element, greyscale);
    } else if (element.type === 'text') {
      drawText(bitmap, element, greyscale);
    }
  }

  return bitmap;
}

function toBackShade(color: Rgba): Rgba {
  const luminance = 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
  // Elements are flat colours, so nearest-level is right here: dithering a
  // solid rectangle would only add noise. Pictures go through `ditherToPanel`.
  const value = toShade(luminance);

  return { r: value, g: value, b: value, a: color.a };
}

function shade(color: Rgba, greyscale: boolean): Rgba {
  return greyscale ? toBackShade(color) : color;
}

function drawRectangle(
  bitmap: Bitmap,
  element: Extract<AnyElement, { type: 'rectangle' }>,
  greyscale: boolean,
) {
  const width = element.width ?? 0;
  const height = element.height ?? 0;
  const { x, y } = anchor(element.align, element.x, element.y, width, height);
  // A radius of half the shorter side is a circle, which is how the device is
  // asked for one. Clamped, because a larger radius has nowhere left to go.
  const radius = Math.max(0, Math.min(element.radius ?? 0, Math.floor(Math.min(width, height) / 2)));

  if (element.fill !== 'none') {
    const fill = shade(parseColor(element.fill_colors?.[0] ?? '#00000000'), greyscale);
    paint(bitmap, x, y, width, height, radius, 0, fill);
  }

  const borderWidth = element.border_width ?? 0;
  if (borderWidth <= 0) {
    return;
  }
  const border = shade(parseColor(element.border_color ?? '#00000000'), greyscale);
  paint(bitmap, x, y, width, height, radius, borderWidth, border);
}

/**
 * A rounded rectangle, filled or as an outline `thickness` pixels wide.
 *
 * Corners are measured from the centre of the corner's arc, so a radius of
 * half the side collapses the straight edges entirely and what is left is a
 * circle. `thickness` of zero fills; anything else keeps the ring between the
 * outer shape and the same shape inset by that much.
 */
function paint(
  bitmap: Bitmap,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  thickness: number,
  color: Rgba,
) {
  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      if (!within(column, row, width, height, radius)) {
        continue;
      }
      if (
        thickness > 0 &&
        within(column - thickness, row - thickness, width - thickness * 2, height - thickness * 2, Math.max(0, radius - thickness))
      ) {
        continue;
      }
      bitmap.set(x + column, y + row, color);
    }
  }
}

/** Whether a pixel is inside a rounded rectangle of this size. */
function within(
  column: number,
  row: number,
  width: number,
  height: number,
  radius: number,
): boolean {
  if (column < 0 || row < 0 || column >= width || row >= height) {
    return false;
  }
  if (radius <= 0) {
    return true;
  }

  // Only the four corner squares are curved; everything else is a rectangle.
  const dx = column < radius ? radius - column : column >= width - radius ? column - (width - radius) + 1 : 0;
  const dy = row < radius ? radius - row : row >= height - radius ? row - (height - radius) + 1 : 0;
  if (dx === 0 || dy === 0) {
    return true;
  }

  return Math.hypot(dx, dy) <= radius + 0.5;
}

function drawText(
  bitmap: Bitmap,
  element: Extract<AnyElement, { type: 'text' }>,
  greyscale: boolean,
) {
  const text = element.text ?? '';
  const color = shade(parseColor(element.color ?? '#00000000'), greyscale);
  if (!text.trim() || color.a === 0) {
    return;
  }

  const scale = element.font === 'bold' ? 2 : 1;
  const width = glyphTextWidth(text, scale);
  const { x, y } = anchor(
    element.align,
    element.x,
    element.y,
    width,
    GLYPH_HEIGHT * scale,
  );

  let cursor = x;
  for (const character of text) {
    drawGlyph(bitmap, character, cursor, y, scale, color);
    cursor += (GLYPH_WIDTH + 1) * scale;
  }
}

function drawGlyph(
  bitmap: Bitmap,
  character: string,
  x: number,
  y: number,
  scale: number,
  color: Rgba,
) {
  const rows = glyph(character);
  for (let row = 0; row < GLYPH_HEIGHT; row += 1) {
    const bits = rows[row] ?? '';
    for (let column = 0; column < GLYPH_WIDTH; column += 1) {
      if (bits[column] !== '1') {
        continue;
      }
      bitmap.fillRect(x + column * scale, y + row * scale, scale, scale, color);
    }
  }
}

function anchor(
  align: string | undefined,
  x: number | undefined,
  y: number | undefined,
  width: number,
  height: number,
): { x: number; y: number } {
  const left = x ?? 0;
  const top = y ?? 0;
  if (align === 'top_right') {
    return { x: left - width, y: top };
  }

  if (align === 'top_mid') {
    return { x: left - Math.floor(width / 2), y: top };
  }

  if (align === 'mid_left') {
    return { x: left, y: top - Math.floor(height / 2) };
  }

  return { x: left, y: top };
}
