import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePdfSettings, calculateSheetLayout } from '../../client/js/features/pdf-export/pdf-layout.logic.js';

test('normalizes standard A4 portrait sheet settings', () => {
  const settings = normalizePdfSettings({ paper: 'A4', columns: 2, rows: 5, margin: 8, gapX: 2, gapY: 2 });
  assert.equal(settings.width, 210); assert.equal(settings.height, 297); assert.equal(settings.columns * settings.rows, 10);
});
test('swaps standard page dimensions for landscape', () => { const settings = normalizePdfSettings({ paper: 'A5', orientation: 'landscape' }); assert.equal(settings.width, 210); assert.equal(settings.height, 148); });
test('calculates whether configured stickers fit on a sheet', () => {
  const settings = normalizePdfSettings({ paper: 'A4', columns: 2, rows: 5, margin: 8, gapX: 2, gapY: 2 });
  assert.equal(calculateSheetLayout(50, 45, settings).fits, true); assert.equal(calculateSheetLayout(100, 60, settings).fits, false);
});
test('supports custom paper dimensions', () => { const settings = normalizePdfSettings({ paper: 'Custom', paperWidth: 100, paperHeight: 150, columns: 1, rows: 2, margin: 5 }); assert.equal(settings.width, 100); assert.equal(settings.height, 150); });
test('rejects invalid layout dimensions and margins', () => { assert.throws(() => normalizePdfSettings({ paper: 'Custom', paperWidth: 0, paperHeight: 200 })); assert.throws(() => normalizePdfSettings({ margin: -1 })); });
test('supports single sticker per page layout', () => { const settings = normalizePdfSettings({ paper: 'Custom', paperWidth: 50, paperHeight: 30, columns: 1, rows: 1, margin: 0 }); assert.equal(calculateSheetLayout(50, 30, settings).fits, true); });
test('applies percentage scaling when checking sheet capacity', () => {
  const normal = normalizePdfSettings({ paper: 'A4', columns: 2, rows: 5, margin: 8, scalePercent: 100 });
  const enlarged = normalizePdfSettings({ paper: 'A4', columns: 2, rows: 5, margin: 8, scalePercent: 120 });
  assert.equal(calculateSheetLayout(50, 45, normal).stickerWidth, 50);
  assert.equal(calculateSheetLayout(50, 45, enlarged).stickerWidth, 60);
});
test('validates printer calibration range and scaling limits', () => {
  assert.throws(() => normalizePdfSettings({ scalePercent: 151 }));
  assert.throws(() => normalizePdfSettings({ offsetX: 21 }));
  const calibrated = normalizePdfSettings({ scalePercent: 99, offsetX: -1.5, offsetY: 2, cutLines: true, alignmentGuides: true });
  assert.equal(calibrated.offsetX, -1.5); assert.equal(calibrated.cutLines, true); assert.equal(calibrated.alignmentGuides, true);
});

test('converts custom inch dimensions and all spacing values to millimetres internally', () => {
  const settings = normalizePdfSettings({ paper: 'Custom', unit: 'in', paperWidth: 2, paperHeight: 2, margin: 0.1, gapX: 0.05, gapY: 0.05, columns: 1, rows: 1, offsetX: 0.02, offsetY: -0.02 });
  assert.equal(settings.width, 50.8);
  assert.equal(settings.height, 50.8);
  assert.equal(settings.margin, 2.54);
  assert.equal(settings.gapX, 1.27);
  assert.equal(settings.offsetX, 0.508);
});
test('reports the exact missing custom dimension instead of a generic numeric error', () => {
  assert.throws(() => normalizePdfSettings({ paper: 'Custom', paperWidth: '', paperHeight: 2 }), /Custom width is required/);
});
test('supports one 2 by 2 inch sticker per page', () => {
  const settings = normalizePdfSettings({ paper: 'Custom', unit: 'in', paperWidth: 2, paperHeight: 2, margin: 0, gapX: 0, gapY: 0, columns: 1, rows: 1 });
  assert.equal(calculateSheetLayout(50.8, 50.8, settings).fits, true);
});
