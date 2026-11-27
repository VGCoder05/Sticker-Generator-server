import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStockReconciliation, validateStockAllocations } from '../services/stockReconciliation.js';

const product = { _id: 'p1', name: 'ABC Fan', productCode: 'ABC-1', fields: { brand: 'ABC' } };
const variant = { _id: 'v1', product: 'p1', mrp: 1499, batchCode: 'A10', stockOnHand: 12 };

test('suggests exact variant when supplied optional MRP and batch match', () => {
  const [row] = buildStockReconciliation([{ name: 'ABC Fan', productCode: 'ABC-1', fields: { mrp: 1499, batchCode: 'a10', quantity: 5 } }], [product], [variant]);
  assert.equal(row.productId, 'p1'); assert.equal(row.existingVariantId, 'v1'); assert.equal(row.suggestedAction, 'receive');
});

test('matches product even when MRP and batch are absent', () => {
  const [row] = buildStockReconciliation([{ name: 'ABC Fan', productCode: 'ABC-1', fields: { quantity: 50 } }], [product], [variant]);
  assert.equal(row.productId, 'p1'); assert.equal(row.valid, true); assert.equal(row.mrp, null); assert.equal(row.existingVariantId, null);
});

test('retains all available variants so user can select any destination', () => {
  const [row] = buildStockReconciliation([{ name: 'ABC Fan', productCode: 'ABC-1', fields: { quantity: 5 } }], [product], [variant]);
  assert.equal(row.availableVariants.length, 1); assert.equal(row.availableVariants[0]._id, 'v1');
});

test('allows explicit split allocation across existing and new variants', () => {
  const [row] = buildStockReconciliation([{ name: 'ABC Fan', productCode: 'ABC-1', fields: { quantity: 50 } }], [product], [variant]);
  assert.equal(validateStockAllocations(row, [{ variantId: 'v1', quantity: 40 }, { createNew: true, quantity: 10, mrp: '', batchCode: 'B' }]), null);
});

test('rejects allocations that do not equal imported quantity', () => {
  const [row] = buildStockReconciliation([{ name: 'ABC Fan', productCode: 'ABC-1', fields: { quantity: 50 } }], [product], [variant]);
  assert.match(validateStockAllocations(row, [{ variantId: 'v1', quantity: 40 }]), /must equal imported quantity/);
});

test('rejects a variant belonging to another product', () => {
  const [row] = buildStockReconciliation([{ name: 'ABC Fan', productCode: 'ABC-1', fields: { quantity: 5 } }], [product], [variant]);
  assert.match(validateStockAllocations(row, [{ variantId: 'other', quantity: 5 }]), /does not belong/);
});
