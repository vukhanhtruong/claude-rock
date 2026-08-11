import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('bundle exists, stamped, exposes LeadFlow', async () => {
  const src = await readFile(new URL('../../assets/dashboard/vendor/reactflow-bundle.js', import.meta.url), 'utf8');
  assert.match(src.slice(0, 200), /new-lead-dashboard v\d+/);
  assert.match(src, /LeadFlow/);
});
