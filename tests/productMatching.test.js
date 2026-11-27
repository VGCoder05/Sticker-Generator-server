import test from 'node:test';
import assert from 'node:assert/strict';
import { findProductMatch, buildProductFields } from '../services/productMatching.js';

const products = [
  { _id: '1', productCode: 'SKU-1', name: 'Mixer', fields: { brand: 'Bajaj' } },
  { _id: '2', productCode: '', name: 'Toaster', fields: { brand: 'Philips' } }
];

test('matches by normalized product code first', () => {
  assert.equal(findProductMatch({ productCode: ' sku-1 ' }, products).product._id, '1');
});
test('falls back to exact normalized name and brand', () => {
  assert.equal(findProductMatch({ productName: 'TOASTER', brand: ' philips ' }, products).product._id, '2');
});
test('does not match same name with a different brand', () => {
  assert.equal(findProductMatch({ productName: 'Toaster', brand: 'Bajaj' }, products).product, null);
});
test('does not use name-only matching when brand is missing', () => {
  assert.equal(findProductMatch({ productName: 'Toaster' }, products).product, null);
});
test('converts imported records into product name, code and additional fields', () => {
  assert.deepEqual(buildProductFields({ productName: 'Mixer', productCode: 'M1', mrp: 500, _sourceRows: [2] }), { name: 'Mixer', productCode: 'M1', fields: { mrp: 500 } });
});
