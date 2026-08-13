import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initRoot, stampOf, ASSET_FILES, SCRIPT_FILES } from '../init-root.mjs';

// The real shipped assets/scripts, not a synthetic stand-in: the stamp mechanism can
// only be checked against the files it actually has to refresh.
const REAL_ASSETS = new URL('../../assets/dashboard', import.meta.url).pathname;
const REAL_SCRIPTS = new URL('..', import.meta.url).pathname;
const ALL_FILES = [...ASSET_FILES, ...SCRIPT_FILES].map((f) => f.to);

const makeAssets = async (stamp) => {
  const dir = await mkdtemp(join(tmpdir(), 'assets-'));
  await mkdir(join(dir, 'vendor'), { recursive: true });
  await writeFile(join(dir, 'index.html'), `<!-- new-lead-dashboard v${stamp} -->\n<p>d</p>`);
  await writeFile(join(dir, 'start.sh'), `# new-lead-dashboard v${stamp}\nnode scripts/serve.mjs "$@"\n`);
  return dir;
};

test('creates the leads/ + scripts/ tree with start.sh alone at the root', async () => {
  const root = join(await mkdtemp(join(tmpdir(), 'r-')), 'leads');
  const res = await initRoot(root, await makeAssets(1));
  assert.equal(res.created, true);
  assert.deepEqual(JSON.parse(await readFile(join(root, 'leads.json'), 'utf8')),
    { version: 1, leads: [] });
  assert.ok(existsSync(join(root, 'leads')), 'leads/ directory created');
  assert.ok(existsSync(join(root, 'scripts', 'index.html')), 'dashboard under scripts/');
  assert.ok(existsSync(join(root, 'start.sh')), 'start.sh at the root');
  assert.ok(!existsSync(join(root, 'index.html')), 'nothing left at the old flat path');
  assert.ok(res.copied.includes('scripts/index.html'));
});
test('start.sh launches the server from its new home under scripts/', async () => {
  const root = join(await mkdtemp(join(tmpdir(), 'r-')), 'leads');
  await initRoot(root, REAL_ASSETS);
  assert.match(await readFile(join(root, 'start.sh'), 'utf8'), /node scripts\/serve\.mjs/);
});
test('refresh copies only newer-stamped files, keeps registry', async () => {
  const root = join(await mkdtemp(join(tmpdir(), 'r-')), 'leads');
  await initRoot(root, await makeAssets(2));
  const first = await initRoot(root, await makeAssets(2));   // same stamp
  assert.equal(first.created, false);
  assert.deepEqual(first.copied, []);
  const second = await initRoot(root, await makeAssets(3));  // newer
  assert.ok(second.copied.includes('scripts/index.html'));
});
test('every file init-root copies carries a stamp init-root can actually read', async () => {
  const sources = [...ASSET_FILES.map((f) => join(REAL_ASSETS, f.from)),
    ...SCRIPT_FILES.map((f) => join(REAL_SCRIPTS, f.from))];
  assert.equal(sources.length, 13, 'the copied set changed size — update this count deliberately');
  for (const src of sources) {
    assert.ok(await stampOf(src) >= 1, `${src}: stamp is invisible to stampOf, so it never refreshes`);
  }
});
test('a fresh root copies the whole set, and a same-stamp refresh copies none', async () => {
  const root = join(await mkdtemp(join(tmpdir(), 'r-')), 'leads');
  const first = await initRoot(root, REAL_ASSETS);
  assert.deepEqual([...first.copied].sort(), [...ALL_FILES].sort());
  for (const rel of ALL_FILES) assert.ok(await stampOf(join(root, rel)) >= 1, `${rel}: unstamped in root`);
  assert.deepEqual((await initRoot(root, REAL_ASSETS)).copied, []);
});
test('a fresh root can run every script SKILL.md tells a user to run', async () => {
  const root = join(await mkdtemp(join(tmpdir(), 'r-')), 'leads');
  await initRoot(root, REAL_ASSETS);
  const run = (script, ...args) => execFileSync(process.execPath, [join(root, script), ...args], { cwd: root });
  run('scripts/lead-upsert.mjs', '--root', root, '--id', 'acme-lead', '--patch', '{"title":"Acme lead","created":"2026-08-13"}');
  const registry = JSON.parse(await readFile(join(root, 'leads.json'), 'utf8'));
  assert.equal(registry.leads[0]?.id, 'acme-lead', 'lead-upsert.mjs writes the registry');
  run('scripts/validate.mjs', '--file', join(root, 'leads.json'));
});
test('missing asset files are skipped, not fatal', async () => {
  const root = join(await mkdtemp(join(tmpdir(), 'r-')), 'leads');
  const assets = await mkdtemp(join(tmpdir(), 'empty-'));
  const res = await initRoot(root, assets);
  assert.equal(res.created, true);
  const assetDests = ASSET_FILES.map((f) => f.to);
  assert.deepEqual(res.copied.filter(r => assetDests.includes(r)), []);
});
