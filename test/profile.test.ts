import assert from 'node:assert/strict';
import { mkdtempSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { ensureAppDirs, profileAt } from '../src/profile';

const DIR = resolve('/home/me/.busybar');

/** A profile where only the named packages were installed. */
function profile(installed: string[], platform: NodeJS.Platform = 'linux') {
  const suffix = platform === 'win32' ? '.cmd' : '';
  const bins = new Set(
    installed.map((name) => join(DIR, 'node_modules', '.bin', `${name}${suffix}`)),
  );

  return profileAt(DIR, { platform, exists: (path) => bins.has(path) });
}

test('an app keeps its config beside the profile, under its own name', () => {
  assert.equal(profile([]).cwdFor('mydota'), join(DIR, 'mydota'));
});

test('the package is found from the application name it draws with', () => {
  const found = profile(['busybar-flights']);
  assert.equal(
    found.binFor('flights'),
    join(DIR, 'node_modules', '.bin', 'busybar-flights'),
  );
});

test('a bin under the plain name wins over the prefixed one', () => {
  const both = profile(['chess', 'busybar-chess']);
  assert.equal(both.binFor('chess'), join(DIR, 'node_modules', '.bin', 'chess'));
});

test('an app that is not installed here has no bin at all', () => {
  assert.equal(profile(['busybar-dota']).binFor('mydota'), undefined);
});

test('windows gets the .cmd shim npm actually writes', () => {
  const win = profile(['busybar-dota'], 'win32');
  assert.equal(win.binFor('dota'), join(DIR, 'node_modules', '.bin', 'busybar-dota.cmd'));
});

test('a fresh profile is given somewhere to put each .env', () => {
  const dir = mkdtempSync(join(tmpdir(), 'busybar-profile-'));
  try {
    const resolver = profileAt(dir);
    const created = ensureAppDirs(resolver, ['dota', 'flights']);

    assert.equal(created.length, 2);
    assert.ok(existsSync(join(dir, 'dota')));
    assert.ok(existsSync(join(dir, 'flights')));
    assert.deepEqual(ensureAppDirs(resolver, ['dota']), [], 'and not made twice');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
