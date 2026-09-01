import { envReader, type EnvReader } from './env';

export const DEFAULTS = {
  usbAddr: '10.0.4.20',
  cloudAddr: 'https://api.busy.app',
  drawPriority: 40,
  frameMs: 200,
  requestTimeoutMs: 10_000,
} as const;

export const LIMITS = {
  drawPriority: { min: 0, max: 100 },
  frameMs: { min: 50, max: 2000 },
  requestTimeoutMs: { min: 1000, max: 30_000 },
} as const;

/**
 * How an app reaches the Bar, and nothing else. Render cadence and request
 * timeouts are the app's own tempo — a speedrun timer wants 60ms frames where
 * a match ticker is happy at 200 — so they stay in the app's config, with
 * `DEFAULTS` / `LIMITS` here as the values worth starting from.
 */
export type BarConfig = {
  busyAddr: string;
  isCloud: boolean;
  isUsb: boolean;
  busyToken: string;
  busyHttpPassword: string;
  drawPriority: number;
};

export function isCloudAddr(addr: string) {
  return /api(?:\.(?:dev|test|stage))?\.busy\.app/i.test(addr);
}

export function isUsbAddr(addr: string) {
  try {
    const url = /^https?:\/\//i.test(addr) ? new URL(addr) : new URL(`http://${addr}`);
    return url.hostname === DEFAULTS.usbAddr;
  } catch {
    return addr.includes(DEFAULTS.usbAddr);
  }
}

export type LoadedBarConfig = {
  bar: BarConfig;
  warnings: string[];
  env: EnvReader;
};

/**
 * Resolves the connection half of an app's config: which Bar, over which
 * transport, with which credential — and warns about credentials that will be
 * ignored on the transport in use. Apps build their own config on top, reusing
 * the returned reader so their warnings land in the same list.
 */
export function loadBarConfig(
  env: NodeJS.ProcessEnv = process.env,
  warnings: string[] = [],
): LoadedBarConfig {
  const reader = envReader(env, warnings);
  const { read, number } = reader;

  const token = read('BUSY_TOKEN');
  const httpPassword = read('BUSY_HTTP_PASSWORD');
  const busyAddr = read('BUSY_ADDR') || (token ? DEFAULTS.cloudAddr : DEFAULTS.usbAddr);
  const cloud = isCloudAddr(busyAddr);
  const usb = isUsbAddr(busyAddr);

  if (cloud && httpPassword) {
    warnings.push('BUSY_HTTP_PASSWORD is ignored on cloud, only BUSY_TOKEN is used');
  }

  if (!cloud && token) {
    warnings.push(
      `BUSY_TOKEN is ignored for ${busyAddr}, that token only works on cloud`,
    );
  }

  if (usb && httpPassword) {
    warnings.push('BUSY_HTTP_PASSWORD is ignored over USB, no auth is required there');
  }

  if (!cloud && !usb && !httpPassword) {
    warnings.push(
      'Wi-Fi needs BUSY_HTTP_PASSWORD (Bar web UI → Network → HTTP API access)',
    );
  }

  return {
    warnings,
    env: reader,
    bar: {
      busyAddr,
      isCloud: cloud,
      isUsb: usb,
      busyToken: cloud ? token : '',
      busyHttpPassword: cloud || usb ? '' : httpPassword,
      drawPriority: number('DRAW_PRIORITY', DEFAULTS.drawPriority, LIMITS.drawPriority),
    },
  };
}
