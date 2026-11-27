import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyAndNormalizeRows, isSerialNumberRow } from '../services/rowClassifier.js';

const mappings = {
  date: 'Date', billNumber: 'Vch/Bill No', partyName: 'Particulars',
  productCode: 'Alias', productName: 'Item Details', quantity: 'Item Count', sellingPrice: 'Prize'
};

test('detects voucher format, skips serial rows and carries bill context to product rows', () => {
  const rows = [
    { _rowNumber: 2, Date: '02-11-2026', 'Vch/Bill No': 4, Particulars: 'HIMALAYA FRESH MART', Alias: 'FRZ-VEG-101', 'Item Details': 'Frozen Green Peas (1 kg Pack)', 'Item Count': 2, Prize: 290 },
    { _rowNumber: 3, Particulars: '7310', 'Item Details': '.Sr.No.' },
    { _rowNumber: 4, 'Item Details': '.1(1)/7310' },
    { _rowNumber: 5, 'Item Details': '.1(2)/7310' },
    { _rowNumber: 6, Alias: 'FRZ-SNK-204', 'Item Details': 'Frozen French Fries (2.5 kg Pack)', 'Item Count': 1, Prize: 340 },
    { _rowNumber: 7, Particulars: 1425, 'Vch/Bill No': '', 'Item Details': 'TOTAL AMT.' }
  ];
  const result = classifyAndNormalizeRows({ rows, mappings });
  assert.equal(result.format, 'voucher');
  assert.equal(result.rows.length, 2);
  assert.equal(result.counts.serial, 3);
  assert.equal(result.counts.summary, 1);
  assert.equal(result.rows[1].Date, '02-11-2026');
  assert.equal(result.rows[1]['Vch/Bill No'], 4);
  assert.equal(result.rows[1].Particulars, 'HIMALAYA FRESH MART');
});

test('keeps simple one-row-per-product data unchanged', () => {
  const simpleRows = [
    { _rowNumber: 2, Item: 'Mixer', Qty: 2 },
    { _rowNumber: 3, Item: 'Fan', Qty: 1 }
  ];
  const result = classifyAndNormalizeRows({ rows: simpleRows, mappings: { productName: 'Item', quantity: 'Qty' } });
  assert.equal(result.format, 'simple');
  assert.equal(result.rows.length, 2);
  assert.equal(result.counts.serial, 0);
});

test('surfaces unknown rows instead of silently importing them', () => {
  const result = classifyAndNormalizeRows({
    rows: [{ _rowNumber: 9, Note: 'Check stock' }],
    mappings: { productName: 'Item', quantity: 'Qty' }
  });
  assert.equal(result.counts.unknown, 1);
  assert.equal(result.requiresUnknownAcknowledgement, true);
  assert.equal(result.rows.length, 0);
});

test('recognizes serial heading and serial detail patterns', () => {
  assert.equal(isSerialNumberRow({ details: '.Sr.No.' }), true);
  assert.equal(isSerialNumberRow({ details: '.1(2)/7310' }), true);
  assert.equal(isSerialNumberRow({ details: 'Frozen Peas' }), false);
});

test('does not mistake a product whose name contains Total for a footer row', () => {
  const result = classifyAndNormalizeRows({
    rows: [{ _rowNumber: 2, Item: 'Total Frozen Dessert', Qty: 1 }],
    mappings: { productName: 'Item', quantity: 'Qty' }
  });
  assert.equal(result.rows.length, 1);
  assert.equal(result.counts.summary, 0);
});
