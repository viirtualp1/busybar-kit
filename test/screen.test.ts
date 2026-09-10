import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BACK, FRONT } from '../src/device';
import { decodeScreenFrame, SCREEN } from '../src/screen';

/** What the device sends: base64, no header, and two different layouts. */
function frontBytes(fill: (pixel: number) => [number, number, number]): Buffer {
  const bytes = Buffer.alloc(SCREEN[0].bytes);
  for (let pixel = 0; pixel < FRONT.width * FRONT.height; pixel += 1) {
    bytes.set(fill(pixel), pixel * 3);
  }

  return bytes;
}

function pixel(bitmap: { data: Uint8Array; width: number }, x: number, y: number) {
  const offset = (y * bitmap.width + x) * 4;

  return [
    bitmap.data[offset],
    bitmap.data[offset + 1],
    bitmap.data[offset + 2],
    bitmap.data[offset + 3],
  ];
}

test('the front is three bytes a pixel, in RGB order', () => {
  const bytes = frontBytes(() => [200, 100, 50]);
  const bitmap = decodeScreenFrame(bytes, 0);

  assert.equal(bitmap.width, FRONT.width);
  assert.equal(bitmap.height, FRONT.height);
  assert.deepEqual(pixel(bitmap, 0, 0), [200, 100, 50, 255]);
});

test('front pixels run left to right, then down', () => {
  // A single red pixel at (1, 0) and a single green one at (0, 1).
  const bytes = Buffer.alloc(SCREEN[0].bytes);
  bytes.set([255, 0, 0], 1 * 3);
  bytes.set([0, 255, 0], FRONT.width * 3);
  const bitmap = decodeScreenFrame(bytes, 0);

  assert.deepEqual(pixel(bitmap, 1, 0), [255, 0, 0, 255]);
  assert.deepEqual(pixel(bitmap, 0, 1), [0, 255, 0, 255]);
});

test('the back is four bits a pixel, the left one in the high nibble', () => {
  const bytes = Buffer.alloc(SCREEN[1].bytes);
  // 0xF0: the first pixel white, the second black.
  bytes[0] = 0xf0;
  const bitmap = decodeScreenFrame(bytes, 1);

  assert.equal(bitmap.width, BACK.width);
  assert.equal(bitmap.height, BACK.height);
  assert.deepEqual(pixel(bitmap, 0, 0), [255, 255, 255, 255]);
  assert.deepEqual(pixel(bitmap, 1, 0), [0, 0, 0, 255]);
});

test('the back is grey, and every level lands where it should', () => {
  const bytes = Buffer.alloc(SCREEN[1].bytes);
  bytes[0] = 0x80; // level 8 of 15
  const [r, g, b] = decodeScreenFrame(bytes, 1).data;

  assert.equal(r, g);
  assert.equal(g, b);
  assert.equal(r, Math.round((8 * 255) / 15));
});

test('the sizes are the panels, not a guess', () => {
  assert.equal(SCREEN[0].bytes, FRONT.width * FRONT.height * 3);
  assert.equal(SCREEN[1].bytes, (BACK.width * BACK.height) / 2, 'half a byte a pixel');
});

test('base64 is decoded, because that is what the body actually is', () => {
  const bytes = frontBytes(() => [10, 20, 30]);
  const bitmap = decodeScreenFrame(bytes.toString('base64'), 0);

  assert.deepEqual(pixel(bitmap, 0, 0), [10, 20, 30, 255]);
});

test('a short frame is refused with what was missing, not drawn as garbage', () => {
  assert.throws(
    () => decodeScreenFrame(Buffer.alloc(10), 0),
    /10 bytes short of the 3456/,
  );
});
