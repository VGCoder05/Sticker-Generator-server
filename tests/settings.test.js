import test from 'node:test';
import assert from 'node:assert/strict';
import { makeUniqueCode } from '../services/stickerGeneration.js';
import { validateSettings } from '../../client/js/features/settings/settings.logic.js';

test('custom code settings generate expected prefix, date and random length', () => {
  const code = makeUniqueCode({ codePrefix: 'GE', codeDateFormat: 'YYYYMMDD', codeRandomLength: 10 }, new Date('2026-11-27T00:00:00.000Z'));
  assert.match(code, /^GE-20261127-[A-F0-9]{10}$/);
});

test('code format supports omitting date segment', () => {
  const code = makeUniqueCode({ codePrefix: 'TAG', codeDateFormat: 'NONE', codeRandomLength: 6 });
  assert.match(code, /^TAG-[A-F0-9]{6}$/);
});

test('settings validation rejects unsafe prefix and out-of-range lengths', () => {
  const errors = validateSettings({ codePrefix: 'bad prefix!', codeRandomLength: 2, defaultMargin: 5 });
  assert.equal(errors.length, 2);
});

test('settings validation accepts supported defaults', () => {
  assert.deepEqual(validateSettings({ codePrefix: 'STK', codeRandomLength: 8, defaultMargin: 5 }), []);
});

test('EAN-13 setting creates a 13-digit code with a valid check digit', () => {
  const code = makeUniqueCode({ defaultBarcodeFormat: 'EAN13' });
  assert.match(code, /^\d{13}$/);
  const sum = [...code.slice(0, 12)].reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);
  assert.equal(Number(code[12]), (10 - (sum % 10)) % 10);
});
