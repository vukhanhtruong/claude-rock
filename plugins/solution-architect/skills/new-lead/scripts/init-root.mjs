// scripts/init-root.mjs
// new-lead-dashboard v2
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile, copyFile, chmod } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const SCRIPTS = dirname(fileURLToPath(import.meta.url));
export const ASSET_FILES = [
  { from: 'index.html', to: 'scripts/index.html' },
  { from: 'detail.html', to: 'scripts/detail.html' },
  { from: 'stats.mjs', to: 'scripts/stats.mjs' },
  { from: 'vendor/reactflow-bundle.js', to: 'scripts/vendor/reactflow-bundle.js' },
  { from: 'start.sh', to: 'start.sh' },
];
export const SCRIPT_FILES = [
  { from: 'serve.mjs', to: 'scripts/serve.mjs' },
  { from: 'lead-upsert.mjs', to: 'scripts/lead-upsert.mjs' },
  { from: 'validate.mjs', to: 'scripts/validate.mjs' },
  { from: 'lib/registry.mjs', to: 'scripts/lib/registry.mjs' },
  { from: 'lib/port.mjs', to: 'scripts/lib/port.mjs' },
  { from: 'lib/enrich.mjs', to: 'scripts/lib/enrich.mjs' },
  { from: 'lib/map.mjs', to: 'scripts/lib/map.mjs' },
  { from: 'lib/map-nodes.mjs', to: 'scripts/lib/map-nodes.mjs' },
];

const DIRS = ['leads', 'scripts/lib', 'scripts/vendor'];

export async function initRoot(root, assetsDir) {
  for (const dir of DIRS) await mkdir(join(root, dir), { recursive: true });
  const created = await ensureRegistry(root);
  const copied = [];
  for (const f of ASSET_FILES) copied.push(...await copyIfNewer(join(assetsDir, f.from), root, f.to));
  for (const f of SCRIPT_FILES) copied.push(...await copyIfNewer(join(SCRIPTS, f.from), root, f.to));
  return { created, copied };
}

async function ensureRegistry(root) {
  if (existsSync(join(root, 'leads.json'))) return false;
  await writeFile(join(root, 'leads.json'), JSON.stringify({ version: 1, leads: [] }, null, 2) + '\n');
  return true;
}

async function copyIfNewer(src, root, rel) {
  const dest = join(root, rel);
  const [destStamp, srcStamp] = await Promise.all([stampOf(dest), stampOf(src)]);
  if (destStamp >= srcStamp) return [];
  await copyFile(src, dest);
  if (rel.endsWith('.sh')) await chmod(dest, 0o755);
  return [rel];
}

// A header window rather than the whole file, so a stamp quoted in prose or in a
// string literal further down cannot be mistaken for the file's own. Sized to clear a
// path comment plus an import block, because a stamp legitimately sits below one:
// lib/registry.mjs stamps at line 6 and read as 0 under the previous 3-line window, so
// it silently never refreshed. init-root.test.mjs pins this for every copied file.
const STAMP_LINES = 10;

export async function stampOf(file) {
  if (!existsSync(file)) return -1;
  const head = (await readFile(file, 'utf8')).split('\n', STAMP_LINES).join('\n');
  return Number(head.match(/new-lead-dashboard v(\d+)/)?.[1] ?? 0);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { values } = parseArgs({ options: { root: { type: 'string' }, assets: { type: 'string' } } });
  if (!values.root) { console.error('usage: init-root.mjs --root <dir> [--assets <dir>]'); process.exit(2); }
  const assets = values.assets ?? join(SCRIPTS, '..', 'assets', 'dashboard');
  const res = await initRoot(values.root, assets);
  console.log(JSON.stringify(res));
}
