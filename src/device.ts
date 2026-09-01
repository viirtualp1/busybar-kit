/**
 * Physical facts about the BUSY Bar screens. These are hardware, not app
 * choices: every app draws into the same 72x16 front strip and 160x80 back
 * panel. Per-app named slots (where the clock sits, how wide a hero column is)
 * belong in the app's own layout module, spread on top of these.
 */
export const FRONT = {
  width: 72,
  height: 16,
} as const;

const BACK_HEIGHT = 80;
const BACK_FIRST_ROW_Y = 18;
const BACK_ROW_HEIGHT = 12;

export const BACK = {
  width: 160,
  height: BACK_HEIGHT,
  headerY: 2,
  subHeaderY: 9,
  firstRowY: BACK_FIRST_ROW_Y,
  rowHeight: BACK_ROW_HEIGHT,
  maxRows: Math.floor((BACK_HEIGHT - BACK_FIRST_ROW_Y) / BACK_ROW_HEIGHT),
  leftX: 2,
  rightX: 82,
  columnWidth: 76,
} as const;

export type BarFont = 'tiny' | 'small' | 'bold';

/**
 * Upper bound per glyph. The device fonts may be narrower, so clipping is
 * conservative: text can come out shorter than strictly necessary, never wider
 * than its box.
 */
export const FONT_WIDTH: Record<BarFont, number> = {
  tiny: 4,
  small: 4,
  bold: 8,
};

export function textWidth(text: string, font: BarFont) {
  return text.length * FONT_WIDTH[font];
}

export function clipToWidth(
  text: string,
  widthPx: number,
  font: BarFont,
  ellipsis = '.',
) {
  const maxChars = Math.max(1, Math.floor(widthPx / FONT_WIDTH[font]));
  if (text.length <= maxChars) {
    return text;
  }

  if (maxChars <= 2 || maxChars <= ellipsis.length) {
    return text.slice(0, maxChars);
  }

  return `${text.slice(0, maxChars - ellipsis.length)}${ellipsis}`;
}

export function fittingChars(widthPx: number, glyphWidth: number) {
  return Math.max(0, Math.floor(widthPx / glyphWidth));
}

export type RowGeometry = { firstRowY: number; rowHeight: number };

/** Top edge of back-panel row `index`. Apps with a different grid pass their own. */
export function rowY(index: number, geometry: RowGeometry = BACK) {
  return geometry.firstRowY + index * geometry.rowHeight;
}

/**
 * A back-panel row grid: how many rows of `rowHeight` fit below `firstRowY`.
 * An app with a taller header (or none) starts its rows somewhere else.
 */
export function backRowGrid(
  firstRowY: number,
  rowHeight: number = BACK.rowHeight,
  height: number = BACK.height,
) {
  return {
    firstRowY,
    rowHeight,
    maxRows: Math.floor((height - firstRowY) / rowHeight),
  } as const;
}
