#!/usr/bin/env node
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';

// Node's ESM loader wants a real file name; tsc leaves extensionless specifiers.
const argument = process.argv[2] ?? 'dist';
const dist = isAbsolute(argument) ? argument : resolve(process.cwd(), argument);
const EXTENSIONS = /\.(?:js|json|mjs|cjs|node)$/;

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      walk(path);
      continue;
    }
    if (!/\.(?:js|d\.ts)$/.test(name)) {
      continue;
    }

    const source = readFileSync(path, 'utf8');
    const next = source.replace(
      /(from\s+|import\s*\()(['"])(\.[^'"]+)\2/g,
      (match, prefix, quote, spec) =>
        EXTENSIONS.test(spec) ? match : `${prefix}${quote}${spec}.js${quote}`,
    );
    if (next !== source) {
      writeFileSync(path, next);
    }
  }
}

walk(dist);
