import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { findLeadsRoot, readRegistry, writeRegistry } from '../lib/registry.mjs';

const EMPTY = { version: 1, leads: [] };
const makeRoot = async () => {
  const root = await mkdtemp(join(tmpdir(), 'leads-'));
  await writeFile(join(root, 'leads.json'), JSON.stringify(EMPTY));
  return root;
};

test('findLeadsRoot walks up from nested dir', async () => {
  const root = await makeRoot();
  const nested = join(root, 'acme-crm', 'dist');
  await mkdir(nested, { recursive: true });
  assert.equal(findLeadsRoot(nested), root);
});
test('findLeadsRoot returns null when no marker', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'nomark-'));
  assert.equal(findLeadsRoot(dir), null);
});
test('writeRegistry is atomic and validated', async () => {
  const root = await makeRoot();
  await assert.rejects(() => writeRegistry(root, { version: 9, leads: [] }), /invalid/);
  const lead = { id: 'a-b', client: 'A', title: 'T', status: 'active',
    created: '2026-08-07', closed: null, value: null, scenario: null };
  await writeRegistry(root, { version: 1, leads: [lead] });
  assert.deepEqual((await readRegistry(root)).leads[0], lead);
  assert.ok(!existsSync(join(root, 'leads.json.tmp')));
  assert.ok(!existsSync(join(root, 'leads.json.lock')));
});
test('writeRegistry refuses when locked', async () => {
  const root = await makeRoot();
  await writeFile(join(root, 'leads.json.lock'), '');
  await assert.rejects(() => writeRegistry(root, EMPTY), /locked/);
});
