import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BACK, FRONT } from '../src/device';
import { band, type AnyElement } from '../src/elements';
import { Bitmap, parseColor } from '../src/preview/png';
import { renderBack, renderFront } from '../src/preview/raster';

function pixel(bitmap: Bitmap, x: number, y: number) {
  const offset = (y * bitmap.width + x) * 4;

  return {
    r: bitmap.data[offset] ?? 0,
    g: bitmap.data[offset + 1] ?? 0,
    b: bitmap.data[offset + 2] ?? 0,
  };
}

const GREEN = '#3FBF5FFF';
const RED = '#E14B3AFF';

function twoBands(): AnyElement[] {
  const half = FRONT.width / 2;

  return [band('left', 0, half, GREEN), band('right', half, half, RED)];
}

test('colours parse with and without an alpha byte', () => {
  assert.deepEqual(parseColor('#FF8040FF'), { r: 255, g: 128, b: 64, a: 255 });
  assert.deepEqual(parseColor('#FF8040'), { r: 255, g: 128, b: 64, a: 255 });
  assert.equal(parseColor('#00000000').a, 0);
  assert.equal(parseColor('nonsense').a, 0);
});

test('the rendered displays are exactly device sized', () => {
  const front = renderFront(twoBands());
  assert.equal(front.width, FRONT.width);
  assert.equal(front.height, FRONT.height);

  const back = renderBack([]);
  assert.equal(back.width, BACK.width);
  assert.equal(back.height, BACK.height);
});

test('the front keeps colour, since it is an RGB panel', () => {
  const bitmap = renderFront(twoBands());

  const left = pixel(bitmap, 1, 10);
  const right = pixel(bitmap, FRONT.width - 2, 10);
  assert.ok(left.g > left.r, 'left band should be green-dominant');
  assert.ok(right.r > right.g, 'right band should be red-dominant');
});

test('the back is flattened to grey, matching the real OLED', () => {
  const bitmap = renderBack([
    {
      id: 'panel',
      type: 'rectangle',
      display: 'back',
      align: 'top_left',
      x: 0,
      y: 0,
      width: BACK.width,
      height: BACK.height,
      fill: 'solid',
      fill_colors: [GREEN],
      border_width: 0,
      border_color: '#00000000',
      timeout: 0,
    },
  ]);

  for (let x = 0; x < bitmap.width; x += 7) {
    for (let y = 0; y < bitmap.height; y += 7) {
      const { r, g, b } = pixel(bitmap, x, y);
      assert.equal(r, g, `expected grey at ${x},${y}`);
      assert.equal(g, b, `expected grey at ${x},${y}`);
    }
  }
});

test('elements for the other display are skipped', () => {
  const drawn = renderFront([band('left', 0, FRONT.width, GREEN)]);
  const skipped = renderFront([
    { ...band('left', 0, FRONT.width, GREEN), display: 'back' },
  ]);
  assert.notDeepEqual(pixel(drawn, 5, 5), pixel(skipped, 5, 5));
});

test('the encoder emits a real PNG signature and IEND', () => {
  const png = new Bitmap(4, 2).toPng();
  assert.deepEqual(
    [...png.subarray(0, 8)],
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  );
  assert.equal(png.subarray(png.length - 8, png.length - 4).toString('ascii'), 'IEND');
});

test('scaling keeps pixels square and countable', () => {
  const bitmap = new Bitmap(2, 1, { r: 0, g: 0, b: 0, a: 255 });
  bitmap.set(1, 0, { r: 255, g: 255, b: 255, a: 255 });
  const scaled = bitmap.scale(4);
  assert.equal(scaled.width, 8);
  assert.equal(scaled.height, 4);
  assert.equal(pixel(scaled, 0, 0).r, 0);
  assert.equal(pixel(scaled, 7, 3).r, 255);
});
