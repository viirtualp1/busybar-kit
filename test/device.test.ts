import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  BACK,
  backRowGrid,
  clipToWidth,
  fittingChars,
  FONT_WIDTH,
  FRONT,
  rowY,
  textWidth,
} from '../src/device';
import { fillWidth, MIN_FILL } from '../src/elements';

test('text is clipped to the box it has to fit', () => {
  assert.equal(clipToWidth('Team Spirit', 200, 'tiny'), 'Team Spirit');
  assert.equal(clipToWidth('Team Spirit', 6 * FONT_WIDTH.tiny, 'tiny'), 'Team .');
  assert.equal(clipToWidth('Team Spirit', FONT_WIDTH.tiny, 'tiny'), 'T');
});

test('a longer ellipsis eats one more character, never the box', () => {
  const clipped = clipToWidth('A very long split name', 24, 'tiny', '..');
  assert.equal(clipped, 'A ve..');
  assert.ok(textWidth(clipped, 'tiny') <= 24);
  assert.equal(clipToWidth('abcdef', 8, 'tiny', '..'), 'ab');
  assert.equal(clipToWidth('abcdef', 1, 'tiny', '..'), 'a');
});

test('a clipped line never outgrows its slot', () => {
  assert.equal(textWidth('1:05:30', 'tiny'), 7 * FONT_WIDTH.tiny);
  assert.equal(textWidth('', 'tiny'), 0);
});

test('a bold glyph costs twice a tiny one', () => {
  assert.equal(FONT_WIDTH.bold, FONT_WIDTH.tiny * 2);
});

test('character budgets come from the panel width, not a guess', () => {
  assert.equal(fittingChars(FRONT.width - 2, FONT_WIDTH.tiny), 17);
  assert.equal(fittingChars(3, 4), 0);
});

test('back rows are stacked below the header and stay on the panel', () => {
  assert.equal(rowY(0), BACK.firstRowY);
  assert.equal(rowY(1) - rowY(0), BACK.rowHeight);
  assert.ok(rowY(BACK.maxRows - 1) + BACK.rowHeight <= BACK.height);
});

test('an app with its own header height gets its own row grid', () => {
  const grid = backRowGrid(16);
  assert.equal(grid.maxRows, 5);
  assert.equal(rowY(0, grid), 16);
  assert.ok(rowY(grid.maxRows - 1, grid) + grid.rowHeight <= BACK.height);
});

test('a split strip always leaves both sides visible', () => {
  assert.equal(fillWidth(0.5), FRONT.width / 2);
  assert.equal(fillWidth(10), FRONT.width - MIN_FILL);
  assert.equal(fillWidth(-10), MIN_FILL);
});
