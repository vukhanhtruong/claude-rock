# Milestone 01 — Registry + Root Init

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Read `00-overview.md` Global Constraints first — they apply to every task here.

**Goal:** The leads-root foundation: registry read/write/validate library, `validate.mjs` CLI, `init-root.mjs` (create root + copy stamped dashboard assets), `start.sh`.

Base dir for all paths: `plugins/solution-architect/skills/new-lead/`.

---

### Task 1: `lib/registry.mjs` — validateRegistry

**Files:**
- Create: `scripts/lib/registry.mjs`
- Test: `scripts/test/registry.test.mjs`

**Interfaces:**
- Produces: `validateRegistry(registry) -> string[]` (findings, `[]` = valid); constants `STATUSES`, `ID_RE` reused by later tasks.

- [ ] **Step 1: Write failing tests**

```js
// scripts/test/registry.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateRegistry } from '../lib/registry.mjs';

const lead = (over = {}) => ({
  id: 'acme-crm', client: 'Acme', title: 'CRM rebuild', status: 'active',
  created: '2026-08-07', closed: null, value: null, scenario: null, ...over,
});
const reg = (leads) => ({ version: 1, leads });

test('valid registry -> no findings', () => {
  assert.deepEqual(validateRegistry(reg([lead()])), []);
});
test('wrong version flagged', () => {
  assert.match(validateRegistry({ version: 2, leads: [] })[0], /version/);
});
test('non-array leads flagged', () => {
  assert.match(validateRegistry({ version: 1, leads: {} })[0], /array/);
});
test('bad id, bad status, duplicate id flagged', () => {
  const findings = validateRegistry(reg([
    lead({ id: 'Bad_ID' }), lead({ status: 'open' }), lead({}),
  ]));
  assert.equal(findings.filter(f => /kebab-case/.test(f)).length, 1);
  assert.equal(findings.filter(f => /status/.test(f)).length, 1);
  assert.equal(findings.filter(f => /duplicate/.test(f)).length, 1);
});
test('closed must be null while active, date once won', () => {
  assert.match(validateRegistry(reg([lead({ closed: '2026-08-08' })]))[0], /closed/);
  assert.match(validateRegistry(reg([lead({ status: 'won' })]))[0], /closed/);
  assert.deepEqual(validateRegistry(reg([lead({ status: 'won', closed: '2026-08-08' })])), []);
});
test('value shape checked', () => {
  assert.match(validateRegistry(reg([lead({ value: { low: 5 } })]))[0], /value/);
  assert.deepEqual(validateRegistry(reg([lead({ value: { low: 1, high: 2, currency: 'USD' } })])), []);
  assert.match(validateRegistry(reg([lead({ value: { low: 9, high: 2, currency: 'USD' } })]))[0], /value/);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test plugins/solution-architect/skills/new-lead/scripts/test/registry.test.mjs`
Expected: FAIL — cannot find module `../lib/registry.mjs`.

- [ ] **Step 3: Implement**

```js
// scripts/lib/registry.mjs
// new-lead-dashboard v1
export const STATUSES = new Set(['active', 'won', 'lost']);
export const ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function validateRegistry(registry) {
  const findings = [];
  if (registry?.version !== 1) findings.push('version must be 1');
  if (!Array.isArray(registry?.leads)) return [...findings, 'leads must be an array'];
  const seen = new Set();
  registry.leads.forEach((l, i) => findings.push(...validateLead(l, `leads[${i}]`, seen)));
  return findings;
}

function validateLead(lead, at, seen) {
  const f = [];
  if (!ID_RE.test(lead.id ?? '')) f.push(`${at}: id must be kebab-case`);
  if (seen.has(lead.id)) f.push(`${at}: duplicate id ${lead.id}`);
  seen.add(lead.id);
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
```

- [ ] **Step 4: Run to verify pass** — same command, expected: all PASS.

- [ ] **Step 5: `/simplify`, then commit**

```bash
git add plugins/solution-architect/skills/new-lead/scripts
git commit -m "feat(new-lead): add registry validation"
```

---

### Task 2: `lib/registry.mjs` — discovery, read, atomic write

**Files:**
- Modify: `scripts/lib/registry.mjs`
- Test: `scripts/test/registry-io.test.mjs`

**Interfaces:**
- Produces: `findLeadsRoot(startDir) -> string|null`, `readRegistry(root) -> Promise<registry>`, `writeRegistry(root, registry) -> Promise<void>`.
- Consumes: `validateRegistry` (Task 1).

- [ ] **Step 1: Write failing tests**

```js
// scripts/test/registry-io.test.mjs
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
```

- [ ] **Step 2: Run to verify failure** — FAIL: `findLeadsRoot` not exported.

- [ ] **Step 3: Implement (append to registry.mjs)**

```js
import { existsSync } from 'node:fs';
import { readFile, writeFile, rename, open, unlink } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

export function findLeadsRoot(startDir) {
  let dir = resolve(startDir);
  while (true) {
    if (existsSync(join(dir, 'leads.json'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export async function readRegistry(root) {
  return JSON.parse(await readFile(join(root, 'leads.json'), 'utf8'));
}

export async function writeRegistry(root, registry) {
  const findings = validateRegistry(registry);
  if (findings.length) throw new Error(`invalid registry: ${findings.join('; ')}`);
  const lock = await acquireLock(root);
  try {
    await writeFile(join(root, 'leads.json.tmp'), JSON.stringify(registry, null, 2) + '\n');
    await rename(join(root, 'leads.json.tmp'), join(root, 'leads.json'));
  } finally {
    await lock.close();
    await unlink(join(root, 'leads.json.lock'));
  }
}

async function acquireLock(root) {
  try {
    return await open(join(root, 'leads.json.lock'), 'wx');
  } catch (err) {
    if (err.code === 'EEXIST') throw new Error('leads.json is locked by another session');
    throw err;
  }
}
```

Move the two `import` blocks to the top of the file (ES modules hoist, but keep source tidy).

- [ ] **Step 4: Run all tests** — `node --test plugins/solution-architect/skills/new-lead/scripts/test/` — all PASS.

- [ ] **Step 5: `/simplify`, then commit**

```bash
git add plugins/solution-architect/skills/new-lead/scripts
git commit -m "feat(new-lead): registry discovery, read, atomic locked write"
```

---

### Task 3: `validate.mjs` CLI

**Files:**
- Create: `scripts/validate.mjs`
- Test: `scripts/test/validate-cli.test.mjs`

**Interfaces:**
- Consumes: `validateRegistry` (Task 1).
- Produces: CLI `node validate.mjs --file <path>` — exit 0 silent on valid, exit 1 printing one finding per line.

- [ ] **Step 1: Write failing test**

```js
// scripts/test/validate-cli.test.mjs
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
```

- [ ] **Step 2: Run to verify failure** — FAIL: validate.mjs missing.

- [ ] **Step 3: Implement**

```js
// scripts/validate.mjs
// new-lead-dashboard v1
import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { validateRegistry } from './lib/registry.mjs';

const { values } = parseArgs({ options: { file: { type: 'string' } } });
if (!values.file) { console.error('usage: validate.mjs --file <leads.json>'); process.exit(2); }
const findings = validateRegistry(JSON.parse(await readFile(values.file, 'utf8')));
if (findings.length) { findings.forEach(f => console.log(f)); process.exit(1); }
```

- [ ] **Step 4: Run tests** — all PASS.
- [ ] **Step 5: `/simplify`, then commit** — `git commit -m "feat(new-lead): leads.json validate CLI"`

---

### Task 4: `init-root.mjs` + `start.sh`

**Files:**
- Create: `scripts/init-root.mjs`, `assets/dashboard/start.sh`
- Test: `scripts/test/init-root.test.mjs`

**Interfaces:**
- Produces: `initRoot(root, assetsDir) -> Promise<{created, copied}>`; CLI `node init-root.mjs --root <dir> [--assets <dir>]`. Copy list (from assetsDir): `index.html`, `detail.html`, `start.sh`, `vendor/reactflow-bundle.js`, plus (from scripts dir, same stamp rule): `serve.mjs`, `lib/registry.mjs`, `lib/enrich.mjs`, `lib/map.mjs`.
- Stamp rule: first 3 lines of a file are searched for `new-lead-dashboard v(\d+)`; copy when destination missing or source stamp > destination stamp; unknown stamp counts as 0.

Note: at this milestone `index.html`, `detail.html`, `serve.mjs`, `enrich.mjs`, `map.mjs`, `vendor/reactflow-bundle.js` don't exist yet — `initRoot` copies whatever of the list exists and skips the rest silently (later milestones fill them in; refresh picks them up).

- [ ] **Step 1: Write failing tests**

```js
// scripts/test/init-root.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initRoot } from '../init-root.mjs';

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
  assert.deepEqual(res.copied, []);
});
```

- [ ] **Step 2: Run to verify failure** — FAIL: init-root.mjs missing.

- [ ] **Step 3: Implement**

```js
// scripts/init-root.mjs
// new-lead-dashboard v1
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile, copyFile, chmod } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const SCRIPTS = dirname(fileURLToPath(import.meta.url));
const ASSET_FILES = ['index.html', 'detail.html', 'start.sh', 'vendor/reactflow-bundle.js'];
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
  if (!existsSync(src)) return [];
  const dest = join(root, rel);
  if (await stampOf(dest) >= await stampOf(src)) return [];
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
```

And the launcher asset:

```sh
# new-lead-dashboard v1
#!/bin/sh
cd "$(dirname "$0")" && exec node serve.mjs "$@"
```

(Shebang under the stamp is wrong order — put `#!/bin/sh` first, stamp second; `stampOf` reads 3 lines so both orders parse. Write it shebang-first.)

- [ ] **Step 4: Run all milestone tests** — `node --test plugins/solution-architect/skills/new-lead/scripts/test/` — all PASS.

- [ ] **Step 5: `/simplify`, then commit** — `git commit -m "feat(new-lead): root init with stamped asset refresh"`

---

**Milestone exit criteria:** all tests green; `node scripts/init-root.mjs --root /tmp/demo-leads` creates a root where `findLeadsRoot` resolves from any subdir; second run copies nothing.
