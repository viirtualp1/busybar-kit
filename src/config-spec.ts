/**
 * How an app describes its own settings — as data, so anything can read it.
 *
 * The app owns the description. `busybar-flights` knows that a route reads
 * `SVO-JFK` and that a departure is a local time with no zone; an editor that
 * had to know that for every app would need editing every time a new app
 * appeared. With a spec, installing a package is enough.
 *
 * Everything here is JSON. Checks are rules rather than functions and a list
 * entry's one-line summary is a template rather than a callback, so a browser
 * or a Dart client can interpret a spec without running the app's JavaScript.
 * An app points at its own from package.json:
 *
 *     "busybar": {
 *       "config": "./dist/config-spec.js",
 *       "configJson": "./dist/config-spec.json"
 *     }
 */

export type FieldType =
  'text' | 'secret' | 'number' | 'boolean' | 'select' | 'datetime' | 'path';

export type FieldOption = { value: string; label: string; hint?: string };

/** Checks a client interprets. Never code — see `validateValue`. */
export type ValidationRule =
  | { kind: 'required'; message?: string }
  | { kind: 'pattern'; pattern: string; message: string }
  | { kind: 'integer'; min: number; max: number; message?: string }
  | { kind: 'datetime'; format: 'local'; message?: string };

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
  rules?: ValidationRule[];
};

/**
 * Whether a change lands without help. Declared by the app because only the
 * app knows: dota re-reads its schedule on every poll, everything else reads
 * its settings once, at startup.
 */
export type Reloads = 'live' | 'restart';

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
  /** How one entry reads in a picker. See `renderSummary` for the syntax. */
  summary: string;
  fields: ConfigField[];
  /** Shown instead of the picker when the file has nothing in it yet. */
  empty?: string;
  reloads?: Reloads;
};

/** Plain settings, one key to a line. */
export type EnvSection = {
  kind: 'env';
  file: string;
  title: string;
  fields: ConfigField[];
  reloads?: Reloads;
};

export type ConfigSection = ListSection | EnvSection;

export type AppConfigSpec = {
  /** The contract version. A client refuses one it does not know. */
  specVersion: number;
  /** The `application_name` the app draws with — the join with everything else. */
  name: string;
  /** One line about what the app is, for the app picker. */
  summary?: string;
  sections: ConfigSection[];
};

export const SPEC_VERSION = 1;

/**
 * Stamps the current version onto a spec, so an author cannot get it wrong and
 * a client always has one to check.
 */
export function defineConfigSpec(
  spec: Omit<AppConfigSpec, 'specVersion'>,
): AppConfigSpec {
  return { specVersion: SPEC_VERSION, ...spec };
}

/**
 * Reads a spec that came from outside — a file, a package, an HTTP response.
 * The version check is the whole point: once something else reads these, the
 * shape is a contract, and a client that guesses at an unknown one is worse
 * than a client that says which package needs updating.
 */
export function parseSpecJson(text: string, source = 'spec'): AppConfigSpec {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    throw new Error(`${source}: not valid JSON`, { cause: error });
  }

  return parseSpec(raw, source);
}

export function parseSpec(raw: unknown, source = 'spec'): AppConfigSpec {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error(`${source}: a spec must be an object`);
  }
  const candidate = raw as Partial<AppConfigSpec>;

  if (candidate.specVersion !== SPEC_VERSION) {
    throw new Error(
      `${source}: specVersion ${String(candidate.specVersion)} is not ${SPEC_VERSION} — update whichever side is older`,
    );
  }
  if (typeof candidate.name !== 'string' || !candidate.name.trim()) {
    throw new Error(`${source}: a spec needs the application name it configures`);
  }
  if (!Array.isArray(candidate.sections)) {
    throw new Error(`${source}: a spec needs a sections array`);
  }

  return candidate as AppConfigSpec;
}

// --- Rules, written as data ---------------------------------------------------

export function required(label?: string): ValidationRule {
  return label
    ? { kind: 'required', message: `${label} is needed` }
    : { kind: 'required' };
}

export function integerIn(min: number, max: number, message?: string): ValidationRule {
  return message ? { kind: 'integer', min, max, message } : { kind: 'integer', min, max };
}

export function matching(pattern: RegExp | string, message: string): ValidationRule {
  return {
    kind: 'pattern',
    pattern: typeof pattern === 'string' ? pattern : pattern.source,
    message,
  };
}

/** `2026-09-08 19:30` — a local time at the airport, with no zone on it. */
export const localDateTime: ValidationRule = { kind: 'datetime', format: 'local' };
