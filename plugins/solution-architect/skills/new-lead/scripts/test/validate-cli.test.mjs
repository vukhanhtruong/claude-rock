import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const run = promisify(execFile);
const CLI = new URL('../validate.mjs', import.meta.url).pathname;

test('exit 0 on valid file', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'v-'));
  const file = join(dir, 'leads.json');
  await writeFile(file, JSON.stringify({ version: 1, leads: [] }));
  const { stdout } = await run('node', [CLI, '--file', file]);
  assert.equal(stdout, '');
});
test('exit 1 with findings on invalid file', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'v-'));
  const file = join(dir, 'leads.json');
  await writeFile(file, JSON.stringify({ version: 3, leads: [] }));
  await assert.rejects(() => run('node', [CLI, '--file', file]),
    (err) => err.code === 1 && /version/.test(err.stdout));
});
