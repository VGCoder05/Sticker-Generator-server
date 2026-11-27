import test from 'node:test';
import assert from 'node:assert/strict';
import { renderSticker } from '../../client/js/features/sticker-generation/generation.view.js';

test('dynamic text elements render values bound to product and variant data keys', () => {
  const html = renderSticker({
    _id: 'sticker-1', uniqueCode: 'STK-001', values: { productName: 'Table Fan', mrp: 1499, batchCode: 'A10' },
    templateSnapshot: { width: 50, height: 30, elements: [
      { id: 'name', type: 'dynamicText', fieldKey: 'productName', x: 1, y: 1, width: 20, height: 5 },
      { id: 'mrp', type: 'dynamicText', fieldKey: 'mrp', x: 1, y: 7, width: 20, height: 5 },
      { id: 'batch', type: 'dynamicText', fieldKey: 'batchCode', x: 1, y: 13, width: 20, height: 5 }
    ] }
  });
  assert.match(html, /Table Fan/);
  assert.match(html, /1499/);
  assert.match(html, /A10/);
});

test('barcode element encodes its selected data key, format and readable-value preference', () => {
  const html = renderSticker({
    _id: 'sticker-2', uniqueCode: 'STK-002', barcodeFormat: 'CODE128', values: { productCode: 'FAN-22' },
    templateSnapshot: { width: 50, height: 30, elements: [
      { id: 'barcode', type: 'barcode', barcodeFieldKey: 'productCode', barcodeFormat: 'CODE128', showBarcodeValue: true, x: 1, y: 1, width: 40, height: 15 }
    ] }
  });
  assert.match(html, /data-barcode="FAN-22"/);
  assert.match(html, /data-format="CODE128"/);
  assert.match(html, /data-display-value="true"/);
});
