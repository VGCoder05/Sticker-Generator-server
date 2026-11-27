import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement, validateTemplate } from '../../client/js/features/templates/templates.logic.js';

test('creates a dynamic field element with product name binding', () => {
  const element = createElement('dynamicText', 0);
  assert.equal(element.type, 'dynamicText');
  assert.equal(element.fieldKey, 'productName');
});
test('accepts a valid template inside its physical dimensions', () => {
  const template = { name: 'Price label', width: 50, height: 30, elements: [createElement('text', 0)] };
  assert.equal(validateTemplate(template).valid, true);
});
test('rejects elements outside the sticker boundary', () => {
  const element = createElement('text', 0); element.x = 49;
  const result = validateTemplate({ name: 'Label', width: 50, height: 30, elements: [element] });
  assert.equal(result.valid, false);
  assert.match(result.errors[0], /outside/);
});
test('requires at least one element', () => {
  assert.equal(validateTemplate({ name: 'Blank', width: 50, height: 30, elements: [] }).valid, false);
});

test('barcode element defaults to auto-generated sticker code and visible value', () => {
  const barcode = createElement('barcode', 0);
  assert.equal(barcode.barcodeFieldKey, 'uniqueCode');
  assert.equal(barcode.barcodeFormat, 'CODE128');
  assert.equal(barcode.showBarcodeValue, true);
});
test('barcode element requires a data field and supported format', () => {
  const barcode = createElement('barcode', 0);
  barcode.barcodeFieldKey = '';
  barcode.barcodeFormat = 'INVALID';
  const result = validateTemplate({ name: 'Barcode', width: 50, height: 30, elements: [barcode] });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error => /data value for every barcode/i.test(error)));
  assert.ok(result.errors.some(error => /barcode format/i.test(error)));
});
