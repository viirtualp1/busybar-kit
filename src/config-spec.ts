/**
 * How an app describes its own settings, so something else can ask about them.
 *
 * The point is that the app owns the description. `busybar-flights` knows that
 * a route reads `SVO-JFK` and that a departure is a local time without a zone;
 * an editor that had to know those things for every app would need editing
 * every time a new app appeared. With a spec, installing a package is enough.
 *
 * Specs are modules rather than JSON because the useful parts — how one entry
 * reads in a picker, whether a value is acceptable — are functions. An app
 * points at its own with a `busybar.config` field in package.json:
 *
 *     "busybar": { "config": "./dist/config-spec.js" }
 */

export type FieldType =
  'text' | 'secret' | 'number' | 'boolean' | 'select' | 'datetime' | 'path';

export type FieldOption = { value: string; label: string; hint?: string };

export type ConfigField = {
  /** The env variable, or the key inside a record. */
  key: string;
  label: string;
  type: FieldType;
  /** One line under the question. */
  hint?: string;
  placeholder?: string;
  /** Empty is not an answer. */
  required?: boolean;
  /** Kept behind "more settings": tuning nobody changes on a normal day. */
  advanced?: boolean;
  /** For `select`. */
  options?: readonly FieldOption[];
  /** What the app itself would do with the setting left out. */
  fallback?: string;
  /** A message when the answer will not do, or nothing when it will. */
  validate?: (value: string) => string | undefined;
};

/** A file of records you add to, edit and remove — flights, fixtures. */
export type ListSection = {
  kind: 'list';
  /** Relative to the app's own config directory. */
  file: string;
  title: string;
  /**
   * The key holding the array, when the file is an object wrapped around one —
   * dota's `schedule.json` keeps its matches under `matches`, beside settings
   * that apply to the whole file. Left out, the file is the array itself.
   */
  at?: string;
  /** Settings that live beside the array in the same file, not in `.env`. */
  header?: ConfigField[];
  /** What one entry looks like in the picker. */
  summary: (entry: Record<string, string>) => string;
  fields: ConfigField[];
  /** Shown instead of the picker when the file has nothing in it yet. */
  empty?: string;
};

/** Plain settings, one key to a line. */
export type EnvSection = {
  kind: 'env';
  file: string;
  title: string;
  fields: ConfigField[];
};

export type ConfigSection = ListSection | EnvSection;

export type AppConfigSpec = {
  /** The `application_name` the app draws with — the join with everything else. */
  name: string;
  /** One line about what the app is, for the app picker. */
  summary?: string;
  sections: ConfigSection[];
};

/** Identity, for the types. Specs are data; this only saves the annotation. */
export function defineConfigSpec(spec: AppConfigSpec): AppConfigSpec {
  return spec;
}

// --- Validators the apps kept writing for themselves -------------------------

export function required(label: string) {
  return (value: string) => (value.trim() ? undefined : `${label} is needed`);
}

export function integerIn(min: number, max: number) {
  return (value: string) => {
    if (!value.trim()) {
      return undefined;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
      return 'a whole number, please';
    }

    return parsed < min || parsed > max ? `between ${min} and ${max}` : undefined;
  };
}

export function matching(pattern: RegExp, message: string) {
  return (value: string) =>
    !value.trim() || pattern.test(value.trim()) ? undefined : message;
}

/**
 * `2026-09-08 19:30` — a local time at the airport, with no zone on it, which
 * is how departure boards and boarding passes are written.
 */
const LOCAL_DATETIME = /^\d{4}-\d{2}-\d{2}[T ]\d{1,2}:\d{2}$/;

export function localDateTime(value: string) {
  if (!value.trim()) {
    return undefined;
  }
  if (!LOCAL_DATETIME.test(value.trim())) {
    return 'YYYY-MM-DD HH:MM';
  }

  return Number.isNaN(Date.parse(value.trim().replace(' ', 'T')))
    ? 'that is not a real date'
    : undefined;
}
