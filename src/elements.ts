import type { RectangleElement, TextElement } from '@busy-app/busy-lib';
import { BASE_COLORS } from './colors';
import { FRONT } from './device';

export type AnyElement = TextElement | RectangleElement;

/**
 * A full-height coloured band across part of the front strip. Both Dota apps
 * use one pair of these to show who is ahead.
 */
export function band(
  id: string,
  x: number,
  width: number,
  color: string,
  height: number = FRONT.height,
): RectangleElement {
  return {
    id,
    type: 'rectangle',
    display: 'front',
    align: 'top_left',
    x,
    y: 0,
    width: Math.max(1, width),
    height,
    fill: 'solid',
    fill_colors: [color],
    border_width: 0,
    border_color: BASE_COLORS.transparent,
    timeout: 0,
  };
}

export const MIN_FILL = 6;

/**
 * Split a strip between two sides by `share` (0..1), always leaving both
 * colours visible so the bar never reads as a single solid block.
 */
export function fillWidth(share: number, width: number = FRONT.width) {
  const raw = Math.round(Math.max(0, Math.min(1, share)) * width);

  return Math.max(MIN_FILL, Math.min(width - MIN_FILL, raw));
}
