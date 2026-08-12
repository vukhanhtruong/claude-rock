import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initRoot, stampOf, ASSET_FILES, SCRIPT_FILES } from '../init-root.mjs';

// The real shipped assets/scripts, not a synthetic stand-in: the stamp mechanism can
// only be checked against the files it actually has to refresh.
const REAL_ASSETS = new URL('../../assets/dashboard', import.meta.url).pathname;
const REAL_SCRIPTS = new URL('..', import.meta.url).pathname;
const ALL_FILES = [...ASSET_FILES, ...SCRIPT_FILES];

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
test('every file init-root copies carries a stamp init-root can actually read', async () => {
  const sources = [...ASSET_FILES.map((r) => join(REAL_ASSETS, r)),
    ...SCRIPT_FILES.map((r) => join(REAL_SCRIPTS, r))];
  assert.equal(sources.length, 9, 'a leads root is a nine-file set — update this test if that changes');
  for (const src of sources) {
    assert.ok(await stampOf(src) >= 1, `${src}: stamp is invisible to stampOf, so it never refreshes`);
  }
});
test('a fresh root copies the whole nine-file set, and a same-stamp refresh copies none', async () => {
  const root = join(await mkdtemp(join(tmpdir(), 'r-')), 'leads');
  const first = await initRoot(root, REAL_ASSETS);
  assert.deepEqual([...first.copied].sort(), [...ALL_FILES].sort());
  for (const rel of ALL_FILES) assert.ok(await stampOf(join(root, rel)) >= 1, `${rel}: unstamped in root`);
  assert.deepEqual((await initRoot(root, REAL_ASSETS)).copied, []);
});
test('missing asset files are skipped, not fatal', async () => {
  const root = join(await mkdtemp(join(tmpdir(), 'r-')), 'leads');
  const assets = await mkdtemp(join(tmpdir(), 'empty-'));
  const res = await initRoot(root, assets);
  assert.equal(res.created, true);
  assert.deepEqual(res.copied.filter(r => ASSET_FILES.includes(r)), []);
});
