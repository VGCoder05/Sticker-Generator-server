import test from 'node:test';
import assert from 'node:assert/strict';
import { consolidateRecords } from '../services/consolidationEngine.js';
const headers = ['Item', 'MRP', 'Batch', 'Pcs', 'Invoice'];
const mappings = { productName: 'Item', mrp: 'MRP', batchCode: 'Batch', quantity: 'Pcs', billNumber: 'Invoice' };
const rows = [
  { _rowNumber: 2, Item: 'ABC', MRP: 1499, Batch: 'A10', Pcs: 5, Invoice: 'B1' },
  { _rowNumber: 3, Item: 'ABC', MRP: 1499, Batch: 'A10', Pcs: 10, Invoice: 'B2' },
  { _rowNumber: 4, Item: 'ABC', MRP: 1599, Batch: 'A11', Pcs: 8, Invoice: 'B3' },
  { _rowNumber: 5, Item: 'BAV', MRP: 1499, Batch: 'A10', Pcs: 4, Invoice: 'B4' },
  { _rowNumber: 6, Item: 'BAV', MRP: 1499, Batch: 'A10', Pcs: 6, Invoice: 'B5' }
];
test('groups by every selected field and sums quantity', () => {
  const result = consolidateRecords({ rows, headers, mappings, groupBy: ['productName', 'mrp', 'batchCode'], aggregations: { quantity: 'SUM', billNumber: 'IGNORE' } });
  assert.equal(result.rows.length, 3);
  assert.deepEqual(result.rows.map((row) => row.quantity), [15, 8, 10]);
  assert.equal(result.summary.mergedRows, 2);
});
test('does not merge different products with same MRP and batch', () => {
  const result = consolidateRecords({ rows, headers, mappings, groupBy: ['productName', 'mrp', 'batchCode'], aggregations: { quantity: 'SUM' } });
  assert.equal(result.rows.filter((row) => row.mrp === 1499 && row.batchCode === 'A10').length, 2);
});
test('flags conflicting FIRST values', () => {
  const result = consolidateRecords({ rows, headers, mappings, groupBy: ['productName', 'mrp', 'batchCode'], aggregations: { quantity: 'SUM', billNumber: 'FIRST' } });
  assert.equal(result.summary.conflictCount, 2);
});
test('disabled consolidation keeps original rows', () => {
  const result = consolidateRecords({ rows, headers, mappings, enabled: false });
  assert.equal(result.rows.length, rows.length);
  assert.equal(result.consolidated, false);
});
test('rejects consolidation without grouping fields', () => {
  assert.throws(() => consolidateRecords({ rows, headers, mappings, groupBy: [] }), /Select at least one mapped field/);
});

test('validates rows even when consolidation is disabled', () => {
  const result = consolidateRecords({
    rows: [{ _rowNumber: 2, Product: 'Mixer', Qty: 0 }],
    headers: ['Product', 'Qty'],
    mappings: { productName: 'Product', quantity: 'Qty' },
    enabled: false
  });
  assert.equal(result.summary.invalidRows, 1);
});
