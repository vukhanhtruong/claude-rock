import { constants, existsSync } from 'node:fs';
import { readFile, rename, open, unlink } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

// scripts/lib/registry.mjs
// new-lead-dashboard v2
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
  if (lead.client !== null && !nonEmpty(lead.client)) {
    f.push(`${at}: client must be null or a non-empty string`);
  }
  if (!nonEmpty(lead.title)) f.push(`${at}: title must be a non-empty string`);
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

function nonEmpty(v) {
  return typeof v === 'string' && v.length > 0;
}

function isValue(v) {
  return typeof v?.low === 'number' && typeof v?.high === 'number'
    && v.low <= v.high && typeof v.currency === 'string';
}

const REGISTRY_FILE = 'leads.json';

const LEADS_DIR = 'leads';

// The single place the on-disk layout is encoded: every lead lives under
// <root>/leads/<id>, and <root>/scripts holds the dashboard. Callers that join
// root and id themselves will silently read the wrong path.
export function leadDir(root, id) {
  return join(root, LEADS_DIR, id);
}

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
    await writeTemp(join(root, `${REGISTRY_FILE}.tmp`), JSON.stringify(registry, null, 2) + '\n');
    await rename(join(root, `${REGISTRY_FILE}.tmp`), join(root, REGISTRY_FILE));
  } finally {
    await lock.close();
    await unlink(join(root, `${REGISTRY_FILE}.lock`));
  }
}

// O_NOFOLLOW, because an ordinary write follows a symlinked temp file: the registry
// would land on its target, and the rename would then move the symlink itself into
// place, leaving leads.json a permanent redirect out of the root. The lock needs no
// such guard - O_CREAT|O_EXCL refuses a symlink by definition.
const TEMP_FLAGS = constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC | constants.O_NOFOLLOW;

async function writeTemp(path, body) {
  const handle = await open(path, TEMP_FLAGS).catch((err) => {
    if (err.code === 'ELOOP') throw new Error(`${REGISTRY_FILE}.tmp is a symlink; refusing to write through it`);
    throw err;
  });
  try { await handle.writeFile(body); } finally { await handle.close(); }
}

async function acquireLock(root) {
  try {
    return await open(join(root, `${REGISTRY_FILE}.lock`), 'wx');
  } catch (err) {
    if (err.code === 'EEXIST') throw new Error('leads.json is locked by another session');
    throw err;
  }
}
