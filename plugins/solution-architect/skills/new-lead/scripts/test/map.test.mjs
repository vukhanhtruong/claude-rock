import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLeadMap } from '../lib/map.mjs';

const ROOT = new URL('./fixtures/root', import.meta.url).pathname;
const byId = (m, id) => m.nodes.find(n => n.id === id);

test('no interview node; evidence feeds architecture directly', async () => {
  const m = await buildLeadMap(ROOT, 'acme-crm');
  assert.equal(byId(m, 'interview'), undefined, 'the interview node is gone');
  assert.equal(byId(m, 'arch').data.status, 'ready');
  assert.equal(byId(m, 'arch').data.href, '/leads/acme-crm/dist/index.html');
  assert.equal(byId(m, 'estimate').data.status, 'ready');     // estimation.json exists
  assert.equal(byId(m, 'estimate').data.href, null);           // estimate.html absent
  assert.equal(byId(m, 'proposal').data.status, 'pending');
  const evidence = m.nodes.filter((n) => n.type === 'evidence');
  assert.ok(evidence.length > 0, 'evidence nodes exist');
  assert.ok(m.edges.some((e) => e.source === evidence[0].id && e.target === 'arch'),
    'evidence links straight to architecture');
});
test('evidence is the human-dropped files, never the generated artifacts', async () => {
  const m = await buildLeadMap(ROOT, 'acme-crm');
  const labels = m.nodes.filter((n) => n.type === 'evidence').map((n) => n.data.label);
  assert.deepEqual(labels, ['rfp.md']);
  for (const generated of ['ARCHITECTURE.md', 'estimation.json', 'brief.md', 'notes.md', 'dist']) {
    assert.ok(!labels.includes(generated), `${generated} must not be listed as evidence`);
  }
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
test('facts panel is the registry entry, not an answers file', async () => {
  const m = await buildLeadMap(ROOT, 'acme-crm');
  assert.equal(m.panels.facts.client, 'Acme Corp');
  assert.equal(m.panels.facts.title, 'CRM Rebuild');
  assert.equal(m.panels.facts.status, 'active');
  assert.equal(m.panels.facts.created, '2026-07-01');
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
