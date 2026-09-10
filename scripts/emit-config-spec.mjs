#!/usr/bin/env node
// Writes `dist/config-spec.json` from the built `dist/config-spec.js`.
//
// Specs are authored in TypeScript for the types and the autocompletion, but a
// browser or a Dart client cannot import a JS module out of node_modules. The
// JSON beside it is what makes the spec readable by anything at all — and
// emitting it from the built module rather than hand-maintaining a second copy
// is what keeps the two from drifting.
import { existsSync, writeFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const argument = process.argv[2] ?? 'dist/config-spec.js';
const source = isAbsolute(argument) ? argument : resolve(process.cwd(), argument);

if (!existsSync(source)) {
  console.error(`busybar-emit-spec: ${source} is not there — build first`);
  process.exit(1);
}

const module = await import(pathToFileURL(source).href);
const spec = module.default;

if (!spec || typeof spec !== 'object' || typeof spec.name !== 'string') {
  console.error(`busybar-emit-spec: ${source} has no config spec as its default export`);
  process.exit(1);
}

const target = source.replace(/\.js$/, '.json');
writeFileSync(target, `${JSON.stringify(spec, null, 2)}\n`);
console.log(`busybar-emit-spec: wrote ${target}`);
