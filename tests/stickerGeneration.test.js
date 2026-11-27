import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStickerValues, mergeStickerOverrides, makeUniqueCode, validateGenerationRequest } from '../services/stickerGeneration.js';

test('generation requires template and at least one variant', () => {
  assert.match(validateGenerationRequest({ items: [] }), /template/i);
  assert.match(validateGenerationRequest({ templateId: 'x', items: [] }), /variant/i);
});
test('generation validates integer quantities and caps total output', () => {
  assert.match(validateGenerationRequest({ templateId: 'x', items: [{ variantId: 'v', quantity: 0 }] }), /whole number/i);
  assert.match(validateGenerationRequest({ templateId: 'x', items: [{ variantId: 'v', quantity: 501 }] }), /500/);
  assert.match(validateGenerationRequest({ templateId: 'x', items: [{ variantId: 'v', quantity: 500 }, { variantId: 'w', quantity: 500 }, { variantId: 'z', quantity: 500 }, { variantId: 'a', quantity: 500 }, { variantId: 'b', quantity: 500 }, { variantId: 'c', quantity: 500 }, { variantId: 'd', quantity: 500 }, { variantId: 'e', quantity: 500 }, { variantId: 'f', quantity: 500 }, { variantId: 'g', quantity: 500 }, { variantId: 'h', quantity: 1 }] }), /5,000/);
  assert.equal(validateGenerationRequest({ templateId: 'x', items: [{ variantId: 'v', quantity: 3 }] }), null);
});
test('each sticker gets a unique printable code', () => {
  const codes = new Set(Array.from({ length: 100 }, () => makeUniqueCode()));
  assert.equal(codes.size, 100);
  assert.match([...codes][0], /^STK-\d{6}-[A-F0-9]{8}$/);
});
test('sticker values combine product, variant and generated code', () => {
  const values = buildStickerValues({ name: 'Table Fan', productCode: 'TF01', fields: { brand: 'ABC' } }, { mrp: 1499, batchCode: 'A10' }, 'STK-TEST');
  assert.equal(values.productName, 'Table Fan');
  assert.equal(values.mrp, 1499);
  assert.equal(values.batchCode, 'A10');
  assert.equal(values.brand, 'ABC');
  assert.equal(values.barcode, 'STK-TEST');
});

test('sticker values expose arbitrary product and variant attributes to custom template fields', () => {
  const values = buildStickerValues({ name: 'Green Peas', fields: { brand: 'ABC', supplierCode: 'SUP-9' } }, { attributes: { expiryDate: '2027-10-01', lotNote: 'Cold storage' } }, 'STK-CUSTOM');
  assert.equal(values.supplierCode, 'SUP-9'); assert.equal(values.expiryDate, '2027-10-01'); assert.equal(values.lotNote, 'Cold storage');
});

test('sticker generation values can be mapped or overridden per selected variant', () => {
  const base = buildStickerValues({ name: 'Fan', fields: { brand: 'ABC', mrp: 999 } }, { mrp: 999, attributes: { expiryDate: '2027-01' } }, 'STK-1');
  const mapped = mergeStickerOverrides(base, { expiryDate: '2028-12', supplierCode: 'SUP-22', uniqueCode: 'do-not-change' });
  assert.equal(mapped.expiryDate, '2028-12'); assert.equal(mapped.supplierCode, 'SUP-22'); assert.equal(mapped.uniqueCode, 'STK-1');
});

test('EAN-13 template format generates a valid 13-digit code with check digit', () => {
  const code = makeUniqueCode({ codePrefix: 'STK' }, new Date('2026-11-27T00:00:00Z'), 'EAN13');
  assert.match(code, /^\d{13}$/);
  const sum = [...code.slice(0, 12)].reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);
  assert.equal(Number(code[12]), (10 - (sum % 10)) % 10);
});
