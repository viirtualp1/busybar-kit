import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BACK } from '../src/device';
import {
  autoContrast,
  ditherToPanel,
  ditherToShades,
  SHADES,
  toGreyTile,
  toShade,
  type RgbaImage,
} from '../src/image/index';
import { Bitmap } from '../src/preview/png';

const STEP = 255 / (SHADES - 1);

function solid(width: number, height: number, value: number): RgbaImage {
  const data = new Uint8Array(width * height * 4);
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    data.set([value, value, value, 255], pixel * 4);
  }

  return { width, height, data };
}

test('a picture comes out square, at the panel height by default', () => {
  const bitmap = ditherToPanel(solid(200, 120, 128));

  assert.equal(bitmap.width, BACK.height);
  assert.equal(bitmap.height, BACK.height);
});

test('every pixel lands exactly on one of the panel levels', () => {
  const gradient: RgbaImage = solid(64, 64, 0);
  for (let y = 0; y < 64; y += 1) {
    for (let x = 0; x < 64; x += 1) {
      const value = Math.round((x / 63) * 255);
      gradient.data.set([value, value, value, 255], (y * 64 + x) * 4);
    }
  }

  const bitmap = ditherToPanel(gradient, { size: 32 });

  for (let index = 0; index < bitmap.data.length; index += 4) {
    const value = bitmap.data[index] ?? 0;
    assert.equal(bitmap.data[index + 1], value, 'grey means r=g=b');
    assert.ok(
      Math.abs(value - Math.round(value / STEP) * STEP) < 0.001,
      `${value} is not one of the ${SHADES} levels`,
    );
  }
});

test('a non-square picture is cropped from the middle, not squashed', () => {
  const wide: RgbaImage = { width: 4, height: 2, data: new Uint8Array(4 * 2 * 4) };
  for (let pixel = 0; pixel < 8; pixel += 1) {
    const value = pixel % 4 >= 2 ? 255 : 0;
    wide.data.set([value, value, value, 255], pixel * 4);
  }

  const tile = toGreyTile(wide, 2);

  assert.ok((tile.values[0] ?? 0) < 128, 'left stays dark');
  assert.ok((tile.values[1] ?? 0) > 128, 'right stays light');
});

test('downscaling averages in linear light, not in gamma', () => {
  // Half black, half white. The linear average is mid-grey, which encodes to
  // about 188 in sRGB — averaging the bytes instead would give 128.
  const checker: RgbaImage = { width: 2, height: 2, data: new Uint8Array(16) };
  checker.data.set([0, 0, 0, 255], 0);
  checker.data.set([255, 255, 255, 255], 4);
  checker.data.set([255, 255, 255, 255], 8);
  checker.data.set([0, 0, 0, 255], 12);

  const tile = toGreyTile(checker, 1);

  assert.ok((tile.values[0] ?? 0) > 180, `expected ~188, got ${tile.values[0]}`);
});

test('a flat dark picture is stretched into the usable range', () => {
  const size = 8;
  const values = Float64Array.from(
    { length: size * size },
    (_, index) => 10 + (index % 8) * 6,
  );
  const stretched = autoContrast({ size, values });

  assert.ok(Math.max(...stretched.values) > 200);
  assert.ok(Math.min(...stretched.values) < 20);
});

test('a genuinely flat picture is left alone rather than amplified into noise', () => {
  const size = 4;
  const values = new Float64Array(size * size).fill(120);

  assert.deepEqual([...autoContrast({ size, values }).values], [...values]);
});

test('dithering keeps the average brightness it was given', () => {
  const size = 32;
  const values = new Float64Array(size * size).fill(100);
  const dithered = ditherToShades({ size, values });
  const average = dithered.reduce((total, value) => total + value, 0) / dithered.length;

  assert.ok(Math.abs(average - 100) < 4, `average drifted to ${average}`);
  assert.ok(new Set(dithered).size > 1, 'a flat mid-grey should not snap to one level');
});

test('toShade is the undithered nearest level', () => {
  assert.equal(toShade(0), 0);
  assert.equal(toShade(255), 255);
  assert.equal(toShade(300), 255, 'clamped');
  assert.equal(toShade(-5), 0, 'clamped');
  assert.equal(toShade(STEP * 3 + 1), Math.round(STEP * 3));
});

test('a bitmap can be built from raw RGBA and drawn into another', () => {
  const source = Bitmap.fromRgba(
    2,
    2,
    new Uint8Array([255, 255, 255, 255, 0, 0, 0, 255, 0, 0, 0, 255, 255, 255, 255, 255]),
  );
  const target = new Bitmap(4, 4);
  target.blit(source, 1, 1);

  const at = (x: number, y: number) => target.data[(y * 4 + x) * 4] ?? 0;

  assert.equal(at(1, 1), 255);
  assert.equal(at(2, 1), 0);
  assert.equal(at(2, 2), 255);
  assert.equal(at(0, 0), 0, 'outside the blit is untouched');
});
