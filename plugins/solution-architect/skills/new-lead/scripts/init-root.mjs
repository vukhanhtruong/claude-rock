// scripts/init-root.mjs
// new-lead-dashboard v1
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile, copyFile, chmod } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const SCRIPTS = dirname(fileURLToPath(import.meta.url));
const ASSET_FILES = ['index.html', 'detail.html', 'start.sh', 'stats.mjs', 'vendor/reactflow-bundle.js'];
const SCRIPT_FILES = ['serve.mjs', 'lib/registry.mjs', 'lib/enrich.mjs', 'lib/map.mjs'];

export async function initRoot(root, assetsDir) {
  await mkdir(join(root, 'vendor'), { recursive: true });
  await mkdir(join(root, 'lib'), { recursive: true });
  const created = await ensureRegistry(root);
  const copied = [];
  for (const rel of ASSET_FILES) copied.push(...await copyIfNewer(join(assetsDir, rel), root, rel));
  for (const rel of SCRIPT_FILES) copied.push(...await copyIfNewer(join(SCRIPTS, rel), root, rel));
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

async function stampOf(file) {
  if (!existsSync(file)) return -1;
  const head = (await readFile(file, 'utf8')).split('\n', 3).join('\n');
  return Number(head.match(/new-lead-dashboard v(\d+)/)?.[1] ?? 0);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { values } = parseArgs({ options: { root: { type: 'string' }, assets: { type: 'string' } } });
  if (!values.root) { console.error('usage: init-root.mjs --root <dir> [--assets <dir>]'); process.exit(2); }
  const assets = values.assets ?? join(SCRIPTS, '..', 'assets', 'dashboard');
  const res = await initRoot(values.root, assets);
  console.log(JSON.stringify(res));
}
