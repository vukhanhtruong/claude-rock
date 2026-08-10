import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const run = promisify(execFile);
const CLI = new URL('../lead-upsert.mjs', import.meta.url).pathname;

const makeRoot = async () => {
  const root = await mkdtemp(join(tmpdir(), 'up-'));
  await writeFile(join(root, 'leads.json'), JSON.stringify({ version: 1, leads: [] }));
  return root;
};

test('insert with defaults, then merge patch', async () => {
  const root = await makeRoot();
  await run('node', [CLI, '--root', root, '--id', 'acme-crm',
    '--patch', '{"client":"Acme","title":"CRM","created":"2026-08-07"}']);
  await run('node', [CLI, '--root', root, '--id', 'acme-crm',
    '--patch', '{"value":{"low":1,"high":2,"currency":"USD"},"scenario":"balanced"}']);
  const reg = JSON.parse(await readFile(join(root, 'leads.json'), 'utf8'));
  assert.equal(reg.leads.length, 1);
  assert.equal(reg.leads[0].client, 'Acme');
  assert.equal(reg.leads[0].scenario, 'balanced');
  assert.equal(reg.leads[0].status, 'active');
});
test('invalid merge rejected, registry untouched', async () => {
  const root = await makeRoot();
  await assert.rejects(
    () => run('node', [CLI, '--root', root, '--id', 'acme-crm', '--patch', '{"status":"open"}']),
    (err) => err.code === 1 && /status/.test(err.stdout + err.stderr));
  const reg = JSON.parse(await readFile(join(root, 'leads.json'), 'utf8'));
  assert.equal(reg.leads.length, 0);
});
