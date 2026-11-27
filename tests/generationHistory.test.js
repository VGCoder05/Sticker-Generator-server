import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHistoryFilter, normalizeStickerIds } from '../services/generationHistory.js';

test('empty history search returns an empty Mongo filter', () => {
  assert.deepEqual(buildHistoryFilter('  '), {});
});

test('history search matches generation, product and unique sticker code', () => {
  const filter = buildHistoryFilter('ABC Fan');
  assert.equal(filter.$or.length, 3);
  assert.equal(filter.$or[1].productName.test('abc fan'), true);
});

test('history search escapes regular expression characters', () => {
  const filter = buildHistoryFilter('A.B');
  assert.equal(filter.$or[1].productName.test('A.B'), true);
  assert.equal(filter.$or[1].productName.test('AxB'), false);
});

test('reprint accepts all stickers when ids are omitted', () => {
  assert.equal(normalizeStickerIds(undefined), null);
});

test('reprint deduplicates selected ids', () => {
  assert.deepEqual(normalizeStickerIds(['a', 'a', 'b']), ['a', 'b']);
});

test('reprint rejects empty or excessive selection', () => {
  assert.throws(() => normalizeStickerIds([]));
  assert.throws(() => normalizeStickerIds(Array.from({ length: 5001 }, (_, i) => String(i))));
});
