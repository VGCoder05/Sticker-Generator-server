import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateStockChange, normalizeBatch, validateVariantInput } from '../services/variantService.js';

test('variant input allows optional MRP and validates opening stock', () => {
  assert.deepEqual(validateVariantInput({ mrp: '1499', openingStock: '5', batchCode: ' a10 ' }), { valid: true, mrp: 1499, openingStock: 5, batchCode: 'A10' });
  assert.equal(validateVariantInput({ mrp: -1 }).valid, false);
  assert.equal(validateVariantInput({ mrp: '', openingStock: 0 }).valid, false);
  assert.equal(validateVariantInput({ mrp: '', openingStock: 1 }).mrp, null);
  assert.equal(validateVariantInput({ mrp: 10, openingStock: -2 }).valid, false);
});

test('stock changes cannot make available stock negative', () => {
  assert.equal(calculateStockChange(10, -3), 7);
  assert.throws(() => calculateStockChange(2, -3), /negative/);
});

test('batch normalization is whitespace-trimmed and case-insensitive', () => {
  assert.equal(normalizeBatch(' a10 '), 'A10');
});
