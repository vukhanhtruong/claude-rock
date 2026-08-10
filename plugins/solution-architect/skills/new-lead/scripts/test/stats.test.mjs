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
  assert.deepEqual(s.pipelineValue, { low: 5, high: 9, currency: 'USD' });
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
// Pins brief-specified behavior (task-1-brief.md: "currency from the first counted lead"):
// active leads with different currencies are summed together with no conversion, and the
// mixed total is labeled with whichever currency belongs to the first counted lead in array
// order. This is intentional per the brief, not a bug — this test documents it so a future
// change to the rule shows up here first.
test('computeStats pipelineValue: mixed currencies summed without conversion', () => {
  const mixed = [
    L({ id: 'e', value: { low: 100, high: 200, currency: 'USD' } }),
    L({ id: 'f', value: { low: 10, high: 20, currency: 'EUR' } }),
  ];
  const s = computeStats(mixed, '2026-08-10');
  assert.deepEqual(s.pipelineValue, { low: 110, high: 220, currency: 'USD' });
});
