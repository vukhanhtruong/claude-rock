import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeStats, filterLeads, sortLeads } from '../../assets/dashboard/stats.mjs';

const L = (o) => ({ id: 'x', client: 'C', title: 'T', status: 'active',
  created: '2026-08-01', closed: null, value: null, scenario: null, ...o });
const leads = [
  L({ id: 'a', status: 'won', closed: '2026-08-05', value: { low: 10, high: 20, currency: 'USD' } }),
  L({ id: 'b', status: 'won', closed: '2026-07-30' }),
  L({ id: 'c', status: 'lost', closed: '2026-08-02', created: '2026-07-29' }),
  L({ id: 'd', client: 'Acme', value: { low: 5, high: 9, currency: 'USD' } }),
];

test('computeStats', () => {
  const s = computeStats(leads, '2026-08-10');
  assert.equal(s.wonThisMonth, 1);
  assert.equal(s.winRate, 0.67);
  assert.deepEqual(s.pipelineValue, [{ currency: 'USD', low: 5, high: 9, count: 1 }]);
  assert.equal(s.avgCycleDays, 4);   // a: 08-01→08-05 = 4d; b: closed < created, skipped; c: 07-29→08-02 = 4d; mean = 4
});
test('computeStats empty', () => {
  const s = computeStats([], '2026-08-10');
  assert.deepEqual(s, { wonThisMonth: 0, winRate: null, pipelineValue: null, avgCycleDays: null });
});
test('filterLeads by status and text', () => {
  assert.deepEqual(filterLeads(leads, { status: 'won', text: '' }).map(l => l.id), ['a', 'b']);
  assert.deepEqual(filterLeads(leads, { status: 'all', text: 'acme' }).map(l => l.id), ['d']);
});
test('sortLeads by value desc, non-mutating', () => {
  const input = [...leads];
  assert.deepEqual(sortLeads(leads, 'value', 'desc').map(l => l.id), ['a', 'd', 'b', 'c']);
  assert.deepEqual(leads, input);
});
// Pins the current rule (owner decision, 2026-08-11, supersedes the old
// "currency from the first counted lead" behavior): active leads are grouped by
// currency, each group summed separately, and groups are ordered alphabetically
// by currency code so the rendered order never reshuffles between renders.
test('computeStats pipelineValue: grouped subtotals per currency', () => {
  const mixed = [
    L({ id: 'e', value: { low: 100, high: 200, currency: 'USD' } }),
    L({ id: 'f', value: { low: 10, high: 20, currency: 'EUR' } }),
    L({ id: 'g', value: { low: 50, high: 60, currency: 'USD' } }),
  ];
  const s = computeStats(mixed, '2026-08-10');
  assert.deepEqual(s.pipelineValue, [
    { currency: 'EUR', low: 10, high: 20, count: 1 },
    { currency: 'USD', low: 150, high: 260, count: 2 },
  ]);
});
test('computeStats pipelineValue: three currencies stay alphabetical, null-value lead excluded', () => {
  const mixed = [
    L({ id: 'h', value: { low: 1, high: 2, currency: 'GBP' } }),
    L({ id: 'i', value: null }),
    L({ id: 'j', value: { low: 3, high: 4, currency: 'AUD' } }),
    L({ id: 'k', value: { low: 5, high: 6, currency: 'JPY' } }),
  ];
  const s = computeStats(mixed, '2026-08-10');
  assert.deepEqual(s.pipelineValue, [
    { currency: 'AUD', low: 3, high: 4, count: 1 },
    { currency: 'GBP', low: 1, high: 2, count: 1 },
    { currency: 'JPY', low: 5, high: 6, count: 1 },
  ]);
});
