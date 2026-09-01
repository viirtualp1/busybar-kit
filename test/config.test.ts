import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DEFAULTS,
  envReader,
  isCloudAddr,
  isUsbAddr,
  loadBarConfig,
} from '../src/config/index';

test('a bare address means USB, a token means cloud', () => {
  assert.equal(loadBarConfig({}).bar.busyAddr, DEFAULTS.usbAddr);
  assert.equal(loadBarConfig({ BUSY_TOKEN: 't' }).bar.busyAddr, DEFAULTS.cloudAddr);
});

test('cloud and USB addresses are recognised', () => {
  assert.ok(isCloudAddr('https://api.busy.app'));
  assert.ok(isCloudAddr('https://api.dev.busy.app'));
  assert.ok(!isCloudAddr('http://10.0.4.20'));
  assert.ok(isUsbAddr('10.0.4.20'));
  assert.ok(isUsbAddr('http://10.0.4.20'));
  assert.ok(!isUsbAddr('192.168.1.5'));
});

test('a credential that the transport ignores is called out', () => {
  const cloud = loadBarConfig({ BUSY_TOKEN: 't', BUSY_HTTP_PASSWORD: 'p' });
  assert.match(cloud.warnings.join('\n'), /BUSY_HTTP_PASSWORD is ignored on cloud/);
  assert.equal(cloud.bar.busyHttpPassword, '');

  const usb = loadBarConfig({ BUSY_ADDR: '10.0.4.20', BUSY_TOKEN: 't' });
  assert.match(usb.warnings.join('\n'), /BUSY_TOKEN is ignored/);
  assert.equal(usb.bar.busyToken, '');
});

test('Wi-Fi without an HTTP password is flagged', () => {
  const wifi = loadBarConfig({ BUSY_ADDR: '192.168.1.5' });
  assert.match(wifi.warnings.join('\n'), /Wi-Fi needs BUSY_HTTP_PASSWORD/);
});

test('numbers are clamped into range, and the correction is reported', () => {
  const warnings: string[] = [];
  const { number } = envReader({ A: '9999', B: 'nope', C: '' }, warnings);
  assert.equal(number('A', 40, { min: 0, max: 100 }), 100);
  assert.equal(number('B', 40, { min: 0, max: 100 }), 40);
  assert.equal(number('C', 40, { min: 0, max: 100 }), 40);
  assert.equal(warnings.length, 2);
  assert.match(warnings[0] ?? '', /out of range 0\.\.100, using 100/);
  assert.match(warnings[1] ?? '', /is not a number, using 40/);
});

test('fractional settings survive when rounding is off', () => {
  const { number } = envReader({ T: '0.5' }, []);
  assert.equal(number('T', 1, { min: 0.1, max: 5 }, false), 0.5);
  assert.equal(number('T', 1, { min: 0.1, max: 5 }), 1);
});
