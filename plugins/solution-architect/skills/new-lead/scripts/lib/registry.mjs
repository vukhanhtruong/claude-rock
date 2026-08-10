import { existsSync } from 'node:fs';
import { readFile, writeFile, rename, open, unlink } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

// scripts/lib/registry.mjs
// new-lead-dashboard v1
export const STATUSES = new Set(['active', 'won', 'lost']);
export const ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function validateRegistry(registry) {
  const findings = [];
  if (registry?.version !== 1) findings.push('version must be 1');
  if (!Array.isArray(registry?.leads)) {
    findings.push('leads must be an array');
    return findings;
  }
  const seen = new Set();
  registry.leads.forEach((l, i) => findings.push(...validateLead(l, `leads[${i}]`, seen)));
  return findings;
}

function validateLead(lead, at, seen) {
  const f = [];
  if (!ID_RE.test(lead.id ?? '')) {
    f.push(`${at}: id must be kebab-case`);
  } else if (seen.has(lead.id)) {
    f.push(`${at}: duplicate id ${lead.id}`);
  } else {
    seen.add(lead.id);
  }
  if (!STATUSES.has(lead.status)) f.push(`${at}: status must be active|won|lost`);
  if (!DATE_RE.test(lead.created ?? '')) f.push(`${at}: created must be YYYY-MM-DD`);
  f.push(...validateClosed(lead, at));
  if (lead.value !== null && !isValue(lead.value)) f.push(`${at}: value must be null or {low<=high, currency}`);
  return f;
}

function validateClosed(lead, at) {
  const ok = lead.status === 'active' ? lead.closed === null : DATE_RE.test(lead.closed ?? '');
  return ok ? [] : [`${at}: closed must be null while active, a date once won/lost`];
}

function isValue(v) {
  return typeof v?.low === 'number' && typeof v?.high === 'number'
    && v.low <= v.high && typeof v.currency === 'string';
}

const REGISTRY_FILE = 'leads.json';

export function findLeadsRoot(startDir) {
  let dir = resolve(startDir);
  while (true) {
    if (existsSync(join(dir, REGISTRY_FILE))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export async function readRegistry(root) {
  return JSON.parse(await readFile(join(root, REGISTRY_FILE), 'utf8'));
}

export async function writeRegistry(root, registry) {
  const findings = validateRegistry(registry);
  if (findings.length) throw new Error(`invalid registry: ${findings.join('; ')}`);
  const lock = await acquireLock(root);
  try {
    await writeFile(join(root, `${REGISTRY_FILE}.tmp`), JSON.stringify(registry, null, 2) + '\n');
    await rename(join(root, `${REGISTRY_FILE}.tmp`), join(root, REGISTRY_FILE));
  } finally {
    await lock.close();
    await unlink(join(root, `${REGISTRY_FILE}.lock`));
  }
}

async function acquireLock(root) {
  try {
    return await open(join(root, `${REGISTRY_FILE}.lock`), 'wx');
  } catch (err) {
    if (err.code === 'EEXIST') throw new Error('leads.json is locked by another session');
    throw err;
  }
}
