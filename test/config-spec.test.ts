import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  defineConfigSpec,
  integerIn,
  localDateTime,
  matching,
  required,
} from '../src/config-spec';

test('a required field will not take an empty answer', () => {
  const check = required('Flight number');
  assert.match(check('') ?? '', /needed/);
  assert.match(check('   ') ?? '', /needed/);
  assert.equal(check('SU100'), undefined);
});

test('a number is checked for being one, and for being in range', () => {
  const port = integerIn(1024, 65_535);
  assert.equal(port('3080'), undefined);
  assert.equal(port(''), undefined, 'empty means "leave it alone"');
  assert.match(port('80') ?? '', /between 1024 and 65535/);
  assert.match(port('1e9') ?? '', /between/);
  assert.match(port('abc') ?? '', /whole number/);
  assert.match(port('3.5') ?? '', /whole number/);
});

test('a pattern says what it wanted rather than just refusing', () => {
  const route = matching(/^[A-Z]{3}-[A-Z]{3}$/, 'three letters, a dash, three letters');
  assert.equal(route('SVO-JFK'), undefined);
  assert.match(route('SVO JFK') ?? '', /three letters/);
});

test('a departure is a local time, with no zone bolted on', () => {
  assert.equal(localDateTime('2026-09-08 19:30'), undefined);
  assert.equal(localDateTime('2026-09-08T19:30'), undefined);
  assert.equal(localDateTime(''), undefined);
  assert.match(localDateTime('08/09/2026 19:30') ?? '', /YYYY-MM-DD/);
  assert.match(localDateTime('2026-13-40 19:30') ?? '', /not a real date/);
});

test('a spec is data, and comes back as it went in', () => {
  const spec = defineConfigSpec({
    name: 'flights',
    sections: [
      {
        kind: 'list',
        file: 'flights.json',
        title: 'Trips',
        summary: (entry) => entry.number ?? '',
        fields: [{ key: 'number', label: 'Flight number', type: 'text' }],
      },
    ],
  });

  assert.equal(spec.sections[0]?.kind, 'list');
});
