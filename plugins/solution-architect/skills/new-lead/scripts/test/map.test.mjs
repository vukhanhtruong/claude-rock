import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLeadMap } from '../lib/map.mjs';

const ROOT = new URL('./fixtures/root', import.meta.url).pathname;
const byId = (m, id) => m.nodes.find(n => n.id === id);

test('nodes for every pipeline stage with disk-truth status', async () => {
  const m = await buildLeadMap(ROOT, 'acme-crm');
  assert.equal(byId(m, 'interview').data.status, 'ready');
  assert.equal(byId(m, 'arch').data.status, 'ready');
  assert.equal(byId(m, 'arch').data.href, '/acme-crm/dist/index.html');
  assert.equal(byId(m, 'estimate').data.status, 'ready');     // estimation.json exists
  assert.equal(byId(m, 'estimate').data.href, null);           // estimate.html absent
  assert.equal(byId(m, 'proposal').data.status, 'pending');
});
test('components parsed from ARCHITECTURE.md §6 table', async () => {
  const m = await buildLeadMap(ROOT, 'acme-crm');
  assert.ok(byId(m, 'component-atlas.api'));
  assert.ok(byId(m, 'component-atlas.web'));
  assert.ok(m.edges.some(e => e.source === 'arch' && e.target === 'component-atlas.api'));
});
test('scenario nodes from estimation.json', async () => {
  const m = await buildLeadMap(ROOT, 'acme-crm');
  assert.ok(byId(m, 'scenario-balanced'));
});
test('panels carry brief, risks, open questions', async () => {
  const m = await buildLeadMap(ROOT, 'acme-crm');
  assert.match(m.panels.brief, /Acme/);
  assert.deepEqual(m.panels.risks, ['Legacy data migration', 'SSO unknowns']);
  assert.deepEqual(m.panels.openQuestions, ['Reporting']);
});
test('sparse lead dir degrades to pending nodes, empty panels', async () => {
  const m = await buildLeadMap(ROOT, 'ghost');
  assert.equal(byId(m, 'arch').data.status, 'pending');
  assert.equal(m.panels.brief, null);
  assert.deepEqual(m.panels.risks, []);
});
