import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDashboardSummary } from '../services/dashboardSummary.js';

test('dashboard summary exposes all live counters', () => {
  const result = buildDashboardSummary({ products: 4, templates: 2, stickers: 17, imports: 3 });
  assert.deepEqual(result.counts, { products: 4, templates: 2, stickers: 17, imports: 3 });
});

test('dashboard activity combines and sorts imports and generations newest first', () => {
  const result = buildDashboardSummary({
    recentGenerations: [{ generationId: 'GEN-2', count: 5, date: '2026-11-27T12:00:00Z' }],
    recentImports: [{ sourceFile: 'items.xlsx', status: 'completed', count: 8, date: '2026-11-27T10:00:00Z' }]
  });
  assert.equal(result.activities.length, 2);
  assert.equal(result.activities[0].type, 'generation');
  assert.equal(result.activities[1].title, 'items.xlsx');
});

test('dashboard activity is limited to eight entries', () => {
  const recentGenerations = Array.from({ length: 12 }, (_, i) => ({ generationId: `G${i}`, count: 1, date: new Date(2026, 0, i + 1) }));
  assert.equal(buildDashboardSummary({ recentGenerations }).activities.length, 8);
});
