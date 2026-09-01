import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BACK, clipToWidth, fittingChars, FONT_WIDTH, FRONT, rowY } from '../src/device';
import { fillWidth, MIN_FILL } from '../src/elements';

test('text is clipped to the box it has to fit', () => {
  assert.equal(clipToWidth('Team Spirit', 200, 'tiny'), 'Team Spirit');
  assert.equal(clipToWidth('Team Spirit', 6 * FONT_WIDTH.tiny, 'tiny'), 'Team .');
  assert.equal(clipToWidth('Team Spirit', FONT_WIDTH.tiny, 'tiny'), 'T');
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

test('a split strip always leaves both sides visible', () => {
  assert.equal(fillWidth(0.5), FRONT.width / 2);
  assert.equal(fillWidth(10), FRONT.width - MIN_FILL);
  assert.equal(fillWidth(-10), MIN_FILL);
});
