/**
 * The palette every app shares: neutrals, chrome and the transparent value the
 * Bar uses to hide an element. App-specific semantics (team colours, ahead/
 * behind, gold) are spread on top of this in the app's own colours module.
 */
export const BASE_COLORS = {
  white: '#FFFFFFFF',
  transparent: '#00000000',
  muted: '#9AA0A6FF',
  dim: '#6B7075FF',
  backText: '#E6E6E6FF',
  backDivider: '#5A5A5AFF',
  clock: '#D8DCE0FF',
  ticker: '#FFFFFFFF',
  panelDark: '#000000FF',
} as const;

export type BaseColor = keyof typeof BASE_COLORS;
