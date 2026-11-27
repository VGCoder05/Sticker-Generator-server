import test from 'node:test';
import assert from 'node:assert/strict';
import { refreshConsolidationSummary, validateConsolidatedRows } from '../../client/js/features/consolidation/consolidation.logic.js';

test('validates product name and positive whole-number quantity', () => {
  const result = validateConsolidatedRows([
    { productName: 'ABC', quantity: 2 },
    { productName: '', quantity: 3 },
    { productName: 'DEF', quantity: 0 },
    { productName: 'GHI', quantity: 1.5 }
  ]);
  assert.equal(result.valid, false);
  assert.equal(result.invalidCount, 3);
  assert.deepEqual(result.errors.map((item) => item.index), [1, 2, 3]);
});

test('refreshes result counts after records are added or removed', () => {
  const state = {
    rows: [{ productName: 'ABC', quantity: 5 }, { productName: 'DEF', quantity: '' }],
    summary: { originalCount: 4, resultCount: 4, mergedRows: 0, invalidRows: 0 }
  };
  const validation = refreshConsolidationSummary(state);
  assert.equal(state.summary.resultCount, 2);
  assert.equal(state.summary.mergedRows, 2);
  assert.equal(state.summary.invalidRows, 1);
  assert.equal(validation.valid, false);
});
