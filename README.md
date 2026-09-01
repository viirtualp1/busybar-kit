# busybar-kit

Shared building blocks for [BUSY Bar](https://busy.bar) apps. Everything here is
app-agnostic: screen geometry, the palette neutrals, formatters, ticker text,
the Bar's error taxonomy, the connection half of a config, and an offline PNG
renderer that draws the same elements the device does.

It is the common half of [busybar-dota](https://github.com/viirtualp1/busybar-dota),
[busybar-mydota](https://github.com/viirtualp1/busybar-mydota) and
[busybar-livesplit](https://github.com/viirtualp1/busybar-livesplit).

```bash
npm install busybar-kit
```

`@busy-app/busy-lib` is a peer dependency — the app owns that version.

## What is in it

| Import                                                                    | What it gives you                                                                                              |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `busybar-kit/device`                                                      | `FRONT` / `BACK` screen sizes, `FONT_WIDTH`, `textWidth`, `clipToWidth`, `fittingChars`, `rowY`, `backRowGrid` |
| `busybar-kit/colors`                                                      | `BASE_COLORS` — neutrals, chrome, and the transparent value that hides an element                              |
| `busybar-kit/format`                                                      | `formatClock`, `formatGold`, `formatCountdown`, `formatStartTime`, `formatKda`, `formatPercent`, …             |
| `busybar-kit/elements`                                                    | `AnyElement`, `band()`, `fillWidth()`                                                                          |
| `busybar-kit/ticker`                                                      | `paginate` / `pageAt` / `scrollAt` / `tickerLine`, and `EventTicker`                                           |
| `busybar-kit/errors`                                                      | `BarApiError`, `toBarError`, `isLowPriority`, `isClientError`, `isForbidden`                                   |
| `busybar-kit/config`                                                      | `loadEnvFile`, `envReader`, `loadBarConfig`                                                                    |
| `busybar-kit/preview`                                                     | `renderFront` / `renderBack` / `Bitmap` — device-accurate PNGs with no hardware                                |
| `busybar-kit/tsconfig.json`, `busybar-kit/eslint`, `busybar-kit/prettier` | the shared toolchain                                                                                           |
| `busybar-fix-esm` (bin)                                                   | rewrites relative imports in `dist/` to carry `.js`, for Node ESM                                              |

## Geometry is hardware, not layout

`FRONT` (72×16) and `BACK` (160×80, with its header rows and 12px grid) are
facts about the device. An app spreads its own named slots on top:

```ts
import { FRONT as DEVICE, BACK as DEVICE_BACK } from 'busybar-kit/device';

export const FRONT = {
  ...DEVICE,
  topY: 0,
  bottomY: 11,
  clockWidth: 24,
} as const;
```

An app whose header is a different height lays out its own row grid, and reads
rows off that instead of the default:

```ts
import { backRowGrid, rowY as gridRowY } from 'busybar-kit/device';

export const BACK = { ...DEVICE_BACK, ...backRowGrid(16), nameX: 8 } as const;

export const rowY = (index: number) => gridRowY(index, BACK);
```

`clipToWidth` takes the truncation mark as a fourth argument (`'.'` by
default, `'..'` where names are cut often enough to want the emphasis).

Colours work the same way — `BASE_COLORS` holds what every app needs, and the
app adds its own semantics:

```ts
import { BASE_COLORS } from 'busybar-kit/colors';

export const COLORS = {
  ...BASE_COLORS,
  radiant: '#3FBF5FFF',
  dire: '#E14B3AFF',
} as const;
```

## Config

`loadBarConfig` resolves which Bar to talk to and over which transport, and
warns about credentials that transport will ignore. That is all it covers —
render cadence and request timeouts are the app's own tempo (a speedrun timer
wants 60ms frames where a match ticker is happy at 200), so they stay in the
app's config with `DEFAULTS` / `LIMITS` as the values worth starting from.

It hands back the same env reader, so an app's own settings collect their
warnings into one list:

```ts
import { loadBarConfig, loadEnvFile } from 'busybar-kit/config';

loadEnvFile();

export function loadConfig(env = process.env) {
  const warnings: string[] = [];
  const { bar, env: read } = loadBarConfig(env, warnings);

  return {
    warnings,
    config: {
      ...bar,
      gsiPort: read.number('GSI_PORT', 3080, { min: 1024, max: 65_535 }),
    },
  };
}
```

## Preview

`renderFront` / `renderBack` rasterise the very element list you send to the
device — a 3×5 pixel font, the same anchoring rules, and the back panel
flattened to the 16 greys the real OLED shows. Useful for screenshots in a
README and for asserting a layout in tests without a Bar on the desk.

```ts
import { renderFront } from 'busybar-kit/preview';

writeFileSync('front.png', renderFront(frontElements(frame)).scale(8).toPng());
```

## Scripts

```bash
npm run check   # lint + typecheck + test
npm run build   # tsc + .js extension fixup
```
