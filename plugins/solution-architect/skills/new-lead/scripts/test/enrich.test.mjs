import { test } from 'node:test';
import assert from 'node:assert/strict';
import { enrichLead } from '../lib/enrich.mjs';

const ROOT = new URL('./fixtures/root', import.meta.url).pathname;

test('artifact flags reflect dist/ disk truth', async () => {
  const e = await enrichLead(ROOT, { id: 'acme-crm' });
  assert.deepEqual(e.artifacts, { docs: true, estimate: false, proposal: false });
  assert.equal(e.hasBrief, true);
  assert.equal(e.hasNotes, true);
});
test('missing lead dir -> all false', async () => {
  const e = await enrichLead(ROOT, { id: 'ghost' });
  assert.deepEqual(e.artifacts, { docs: false, estimate: false, proposal: false });
});
