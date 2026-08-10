import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initRoot } from '../init-root.mjs';

const ASSET_FILES = ['index.html', 'detail.html', 'start.sh', 'vendor/reactflow-bundle.js'];

const makeAssets = async (stamp) => {
  const dir = await mkdtemp(join(tmpdir(), 'assets-'));
  await mkdir(join(dir, 'vendor'), { recursive: true });
  await writeFile(join(dir, 'index.html'), `<!-- new-lead-dashboard v${stamp} -->\n<p>d</p>`);
  await writeFile(join(dir, 'start.sh'), `# new-lead-dashboard v${stamp}\nnode serve.mjs "$@"\n`);
  return dir;
};

test('creates leads.json and copies assets on fresh root', async () => {
  const root = join(await mkdtemp(join(tmpdir(), 'r-')), 'leads');
  const res = await initRoot(root, await makeAssets(1));
  assert.equal(res.created, true);
  assert.deepEqual(JSON.parse(await readFile(join(root, 'leads.json'), 'utf8')),
    { version: 1, leads: [] });
  assert.ok(existsSync(join(root, 'index.html')));
  assert.ok(res.copied.includes('index.html'));
});
test('refresh copies only newer-stamped files, keeps registry', async () => {
  const root = join(await mkdtemp(join(tmpdir(), 'r-')), 'leads');
  await initRoot(root, await makeAssets(2));
  const first = await initRoot(root, await makeAssets(2));   // same stamp
  assert.equal(first.created, false);
  assert.deepEqual(first.copied, []);
  const second = await initRoot(root, await makeAssets(3));  // newer
  assert.ok(second.copied.includes('index.html'));
});
test('missing asset files are skipped, not fatal', async () => {
  const root = join(await mkdtemp(join(tmpdir(), 'r-')), 'leads');
  const assets = await mkdtemp(join(tmpdir(), 'empty-'));
  const res = await initRoot(root, assets);
  assert.equal(res.created, true);
  assert.deepEqual(res.copied.filter(r => ASSET_FILES.includes(r)), []);
});
