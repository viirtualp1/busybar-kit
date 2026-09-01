import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  BarApiError,
  errorMessage,
  isClientError,
  isForbidden,
  isLowPriority,
  toBarError,
} from '../src/errors';

test('a plain rejection body becomes a real Error', () => {
  const error = toBarError({ status: 500, body: { error: 'boom' } });
  assert.ok(error instanceof BarApiError);
  assert.equal(error.status, 500);
  assert.match(error.message, /BUSY Bar responded 500: boom/);
});

test('an Error is passed through untouched', () => {
  const original = new Error('already an error');
  assert.equal(toBarError(original), original);
});

test('a busier app on the screen reads as low priority', () => {
  assert.ok(isLowPriority({ status: 409 }));
  assert.ok(isLowPriority(new Error('draw rejected: low priority')));
  assert.ok(isLowPriority({ body: { error: 'LOW PRIORITY' } }));
  assert.ok(!isLowPriority({ status: 500 }));
});

test('4xx means the request was wrong, not the moment', () => {
  assert.ok(isClientError({ status: 404 }));
  assert.ok(!isClientError({ status: 500 }));
  assert.ok(isForbidden({ status: 403 }));
  assert.ok(isForbidden(new Error('Forbidden')));
});

test('anything at all can be described', () => {
  assert.equal(errorMessage(new Error('x')), 'x');
  assert.equal(errorMessage('plain'), 'plain');
  assert.equal(errorMessage(null), 'null');
});
