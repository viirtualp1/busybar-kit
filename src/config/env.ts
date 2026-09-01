import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export type Limits = { min: number; max: number };

export function loadEnvFile(cwd = process.cwd()) {
  const path = resolve(cwd, '.env');
  if (!existsSync(path)) {
    return;
  }
  // Real environment variables win over the file, same as `node --env-file`.
  process.loadEnvFile(path);
}

export type EnvReader = {
  read: (name: string) => string;
  number: (name: string, fallback: number, limits: Limits, round?: boolean) => number;
};

/**
 * Reads settings out of the environment, clamping numbers into range and
 * collecting a human-readable warning for anything it had to correct.
 */
export function envReader(env: NodeJS.ProcessEnv, warnings: string[]): EnvReader {
  const read = (name: string) => env[name]?.trim() ?? '';

  const number = (name: string, fallback: number, limits: Limits, round = true) => {
    const raw = read(name);
    if (!raw) {
      return fallback;
    }
    const value = Number(raw);
    if (!Number.isFinite(value)) {
      warnings.push(`${name}=${raw} is not a number, using ${fallback}`);
      return fallback;
    }
    const wanted = round ? Math.round(value) : value;
    const clamped = Math.min(limits.max, Math.max(limits.min, wanted));
    if (clamped !== value) {
      warnings.push(
        `${name}=${raw} is out of range ${limits.min}..${limits.max}, using ${clamped}`,
      );
    }
    return clamped;
  };

  return { read, number };
}
