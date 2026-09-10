import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  defineConfigSpec,
  integerIn,
  localDateTime,
  matching,
  parseSpecJson,
  required,
  SPEC_VERSION,
} from '../src/config-spec';
import { validateValue } from '../src/rules';
import { renderSummary } from '../src/summary';

// --- The rules, as data -------------------------------------------------------

test('a required field will not take an empty answer', () => {
  const rules = [required('Flight number')];
  assert.match(validateValue(rules, '') ?? '', /needed/);
  assert.match(validateValue(rules, '   ') ?? '', /needed/);
  assert.equal(validateValue(rules, 'SU100'), undefined);
});

test('a number is checked for being one, and for being in range', () => {
  const rules = [integerIn(1024, 65_535)];
  assert.equal(validateValue(rules, '3080'), undefined);
  assert.equal(validateValue(rules, ''), undefined, 'empty means "leave it alone"');
  assert.match(validateValue(rules, '80') ?? '', /between 1024 and 65535/);
  assert.match(validateValue(rules, 'abc') ?? '', /whole number/);
  assert.match(validateValue(rules, '3.5') ?? '', /whole number/);
});

test('a pattern says what it wanted rather than just refusing', () => {
  const rules = [matching(/^[A-Z]{3}-[A-Z]{3}$/, 'three letters, a dash, three letters')];
  assert.equal(validateValue(rules, 'SVO-JFK'), undefined);
  assert.match(validateValue(rules, 'SVO JFK') ?? '', /three letters/);
});

test('a departure is a local time, with no zone bolted on', () => {
  const rules = [localDateTime];
  assert.equal(validateValue(rules, '2026-09-08 19:30'), undefined);
  assert.equal(validateValue(rules, '2026-09-08T19:30'), undefined);
  assert.equal(validateValue(rules, ''), undefined);
  assert.match(validateValue(rules, '08/09/2026 19:30') ?? '', /YYYY-MM-DD/);
  assert.match(validateValue(rules, '2026-13-40 19:30') ?? '', /not a real date/);
});

test('a secret that is already set does not have to be typed again', () => {
  const field = { label: 'Steam key', required: true, type: 'secret' as const };
  assert.match(validateValue([], '', field) ?? '', /needed/);
  assert.equal(validateValue([], '', field, 'the-existing-key'), undefined);
});

test('a broken pattern in a spec refuses the value rather than throwing', () => {
  const rules = [matching('([unclosed', 'that is not it')];
  assert.equal(validateValue(rules, 'anything'), 'that is not it');
});

// --- The summary template -----------------------------------------------------

const FLIGHT = {
  number: 'SU100',
  from: 'SVO',
  to: 'JFK',
  departure: '2026-09-08 19:30',
  aircraft: 'A359',
};

test('a template reads the values in order', () => {
  assert.equal(
    renderSummary('{number}  {departure}  {aircraft}', FLIGHT),
    'SU100  2026-09-08 19:30  A359',
  );
});

test('a missing value takes its separator with it', () => {
  assert.equal(renderSummary('{number}  {aircraft}', { number: 'SU100' }), 'SU100');
  assert.equal(renderSummary('{number}  {aircraft}', { aircraft: 'A359' }), 'A359');
});

test('a fallback covers the shape the entry was written in', () => {
  assert.equal(renderSummary('{route|from-to}', FLIGHT), 'SVO-JFK', 'no route: joined');
  assert.equal(
    renderSummary('{route|from-to}', { ...FLIGHT, route: 'SVO-JFK' }),
    'SVO-JFK',
    'a route of its own wins',
  );
});

test('a half-filled join renders as nothing, not as a dangling dash', () => {
  assert.equal(renderSummary('{from-to}', { from: 'SVO' }), '');
  assert.equal(renderSummary('{number} {from-to}', { number: 'SU1', to: 'JFK' }), 'SU1');
});

test('a literal glued to a token leaves when the token does', () => {
  assert.equal(
    renderSummary('{teams}  BO{bo}', { teams: 'A vs B', bo: '3' }),
    'A vs B  BO3',
  );
  assert.equal(renderSummary('{teams}  BO{bo}', { teams: 'A vs B' }), 'A vs B');
});

test('an entry with nothing in it summarises to nothing', () => {
  assert.equal(renderSummary('{number}  {route|from-to}', {}), '');
});

// --- The spec itself ----------------------------------------------------------

test('a spec is stamped with the version, so an author cannot get it wrong', () => {
  const spec = defineConfigSpec({
    name: 'flights',
    sections: [
      {
        kind: 'list',
        file: 'flights.json',
        title: 'Trips',
        summary: '{number}',
        fields: [{ key: 'number', label: 'Flight number', type: 'text' }],
      },
    ],
  });

  assert.equal(spec.specVersion, SPEC_VERSION);
  assert.equal(spec.sections[0]?.kind, 'list');
});

test('a spec from outside is read back, version and all', () => {
  const spec = defineConfigSpec({ name: 'flights', sections: [] });
  const back = parseSpecJson(JSON.stringify(spec), 'busybar-flights');

  assert.equal(back.name, 'flights');
});

test('a version we do not know is refused, naming who should update', () => {
  const future = JSON.stringify({ specVersion: 99, name: 'flights', sections: [] });

  assert.throws(
    () => parseSpecJson(future, 'busybar-flights'),
    /busybar-flights: specVersion 99 is not 1/,
  );
});

test('a spec that is not one says so instead of half-loading', () => {
  assert.throws(() => parseSpecJson('{oops', 'busybar-odd'), /not valid JSON/);
  assert.throws(() => parseSpecJson('[]', 'busybar-odd'), /must be an object/);
  assert.throws(
    () => parseSpecJson('{"specVersion":1,"sections":[]}', 'busybar-odd'),
    /needs the application name/,
  );
  assert.throws(
    () => parseSpecJson('{"specVersion":1,"name":"x"}', 'busybar-odd'),
    /needs a sections array/,
  );
});
