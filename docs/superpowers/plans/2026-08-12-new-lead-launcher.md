# new-lead Launcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce `/new-lead` to a workspace launcher that walks the human through `/analyze-requirements → /estimate → /proposal`, and restructure the leads root into `leads/` + `scripts/`.

**Architecture:** Four phases, each committed green before the next. Phase 0 renames the `arch-docs` skill (mechanical). Phase 1 changes the registry contract (`client` becomes nullable) and the on-disk layout. Phase 2 repaths the dashboard server and rewires its data sources away from the deleted `new-lead-answers.json`. Phase 3 rewrites the skill document and deletes what became unreachable.

**Tech Stack:** Node ≥ 20, zero runtime dependencies, `node --test` with `node:assert/strict`. Plain ES modules (`.mjs`). Dashboard is vanilla ES modules loaded by the browser — no build step.

## Global Constraints

- Working directory for every command: `/home/ces-truongvu/WIP/mine/claude-rock/.claude/worktrees/dynamic-workflow`. Branch: `worktree-dynamic-workflow`. Do not switch branches; do not merge.
- Test command: `node --test plugins/solution-architect/skills/new-lead/scripts/test/` (run from the worktree root).
- Quality gates: 20 lines max per function, 3 params max, 2 nesting levels max, 200 lines max per file, 10 functions max per file.
- Commit format: Conventional Commits. Never add AI attribution, `Co-Authored-By`, or `🤖 Generated with` lines.
- `ID_RE` is `^[a-z0-9]+(-[a-z0-9]+)*$` — kebab-case only. Do not widen it.
- `ARCHITECTURE.md` keeps that exact filename. `/proposal` hard-requires it.
- Every file that `init-root.mjs` copies carries a `new-lead-dashboard v<N>` stamp in its first 10 lines. Any file whose content changes in this plan must have its stamp bumped `v1` → `v2`, or existing roots silently never refresh it.

---

## File Structure

**Phase 0 — rename**

| Path | Responsibility |
| --- | --- |
| `plugins/solution-architect/skills/analyze-requirements/` | renamed from `arch-docs/`; contents otherwise untouched |

**Phase 1 — registry + layout**

| Path | Responsibility |
| --- | --- |
| `new-lead/scripts/lib/registry.mjs` | registry schema, validation, atomic IO, **and now `leadDir()`** — the one place the `leads/` layout is encoded |
| `new-lead/assets/dashboard/stats.mjs` | pure dashboard data logic; must tolerate `client: null` |
| `new-lead/scripts/init-root.mjs` | builds the root tree; copy table becomes `{from, to}` pairs |
| `new-lead/scripts/lead-upsert.mjs` | registry writes; `DEFAULTS` gains `client: null` |

**Phase 2 — server + dashboard**

| Path | Responsibility |
| --- | --- |
| `new-lead/scripts/serve.mjs` | HTTP routes; all paths move under `leads/` and `scripts/` |
| `new-lead/scripts/lib/enrich.mjs` | per-lead artifact flags; uses `leadDir()` |
| `new-lead/scripts/lib/map.mjs` | lead lineage graph; evidence now from the filesystem, facts from the registry |
| `new-lead/assets/dashboard/index.html` | list/timeline/wall views; null-client rendering, repathed hrefs |
| `new-lead/assets/dashboard/detail.html` | lead detail; facts panel rebuilt on registry data |

**Phase 3 — the skill**

| Path | Responsibility |
| --- | --- |
| `new-lead/SKILL.md` | the launcher flow — the only behavioural contract |
| `new-lead/README.md` | human-facing overview |
| `new-lead/references/` | **deleted entirely** |

---

## Task 1: Rename `arch-docs` to `analyze-requirements`

Mechanical rename. The frontmatter `description` is deliberately unchanged, so the skill keeps triggering on "architecture docs", "C4 diagrams", "document this codebase". This task has no new tests — its verification is that the existing suite still passes.

**Files:**
- Rename: `plugins/solution-architect/skills/arch-docs/` → `plugins/solution-architect/skills/analyze-requirements/`
- Modify: `plugins/solution-architect/skills/analyze-requirements/SKILL.md:2`
- Modify: `plugins/solution-architect/skills/estimate/scripts/render.mjs:3-5,23`
- Modify: `plugins/solution-architect/skills/estimate/scripts/test/browser.test.mjs:8-9`
- Modify: `plugins/solution-architect/skills/estimate/scripts/test/e2e.test.mjs:7-8`
- Modify: `plugins/solution-architect/skills/proposal/scripts/render.mjs:3-6,17,33,38`
- Modify: `plugins/solution-architect/skills/proposal/scripts/lib/checks.mjs:5`
- Modify: `plugins/solution-architect/skills/proposal/scripts/test/checks-doc.test.mjs:5`
- Modify: `tests/cli.test.mjs` (10 assertions)
- Modify: `README.md`, and the `README.md` / `SKILL.md` of `estimate`, `proposal`, `new-lead`

**Interfaces:**
- Consumes: nothing.
- Produces: the skill directory name `analyze-requirements`. Every later task refers to the chain step as `/analyze-requirements`.

- [ ] **Step 1: Record the current test baseline**

Both suites must be green *before* the rename, so a later failure is attributable.

```bash
node --test plugins/solution-architect/skills/arch-docs/scripts/test/ 2>&1 | tail -5
node --test plugins/solution-architect/skills/estimate/scripts/test/ 2>&1 | tail -5
node --test plugins/solution-architect/skills/proposal/scripts/test/ 2>&1 | tail -5
node --test tests/*.test.mjs 2>&1 | tail -5
```

Expected: `pass` counts non-zero, `fail 0` for each. If anything already fails, stop and report — do not rename over a red suite.

- [ ] **Step 2: Rename the directory**

```bash
git mv plugins/solution-architect/skills/arch-docs \
       plugins/solution-architect/skills/analyze-requirements
```

- [ ] **Step 3: Update the skill's own frontmatter name**

In `plugins/solution-architect/skills/analyze-requirements/SKILL.md`, line 2 only:

```yaml
name: analyze-requirements
```

Leave line 3 (`description:`) exactly as it is.

- [ ] **Step 4: Sweep the string across code, tests and docs**

This rewrites `arch-docs` → `analyze-requirements` everywhere *except* the three identifiers that must not change.

```bash
grep -rl 'arch-docs' \
  plugins/solution-architect/skills/analyze-requirements \
  plugins/solution-architect/skills/estimate \
  plugins/solution-architect/skills/proposal \
  plugins/solution-architect/skills/new-lead \
  tests README.md \
  --include='*.mjs' --include='*.js' --include='*.md' \
| xargs sed -i 's/arch-docs/analyze-requirements/g'
```

- [ ] **Step 5: Restore the three identifiers that must NOT be renamed**

The sweep above touched two of them. Fix both back:

```bash
sed -i "s/name: 'analyze-requirements-research'/name: 'arch-docs-research'/" \
  plugins/solution-architect/skills/analyze-requirements/workflows/research.js
sed -i "s/name: 'analyze-requirements',/name: 'arch-docs',/" \
  plugins/solution-architect/skills/analyze-requirements/scripts/lib/likec4-config.mjs
```

The third, `localStorage['arch-docs-theme']` in `assets/viewer-template.html`, is inside an `.html` file which the sweep's `--include` list excluded — verify it is untouched:

```bash
grep -c "arch-docs-theme" plugins/solution-architect/skills/analyze-requirements/assets/viewer-template.html
```

Expected: `2`. If `0`, the key was renamed — revert those two lines to `arch-docs-theme`. Changing it silently resets every existing reader's light/dark choice.

- [ ] **Step 6: Verify nothing stale remains and nothing over-eager was changed**

```bash
grep -rn 'arch-docs' plugins tests README.md --include='*.mjs' --include='*.js' --include='*.md' --include='*.html' | grep -v node_modules | grep -v '/vendor/'
```

Expected: exactly three lines — `research.js` workflow name, `likec4-config.mjs` project name, and the two `viewer-template.html` localStorage lines (four lines total if the grep counts both localStorage occurrences separately). No `.mjs` import path and no `SKILL.md` prose reference may remain.

- [ ] **Step 7: Run every affected suite**

```bash
node --test plugins/solution-architect/skills/analyze-requirements/scripts/test/
node --test plugins/solution-architect/skills/estimate/scripts/test/
node --test plugins/solution-architect/skills/proposal/scripts/test/
node --test tests/*.test.mjs
```

Expected: same pass counts as Step 1, `fail 0` throughout. A `Cannot find module` error means a missed import path — go back to Step 4.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor(skills): rename arch-docs to analyze-requirements"
```

---

## Task 2: Make `client` nullable end to end

`client` is display-only — nothing in generation reads it. Adoption must be able to skip it. Three files enforce or consume the non-null assumption, and all three change together: the validator rejects null today, and `stats.mjs` would throw on every dashboard search if it didn't.

**Files:**
- Modify: `plugins/solution-architect/skills/new-lead/scripts/lib/registry.mjs:32`
- Modify: `plugins/solution-architect/skills/new-lead/assets/dashboard/stats.mjs:2,19,84`
- Modify: `plugins/solution-architect/skills/new-lead/scripts/lead-upsert.mjs:5`
- Test: `plugins/solution-architect/skills/new-lead/scripts/test/registry.test.mjs`
- Test: `plugins/solution-architect/skills/new-lead/scripts/test/stats.test.mjs`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: `client: null` is a valid registry value. Later tasks may write it and must render it. `title` stays hard-required and non-empty.

- [ ] **Step 1: Write the failing validator tests**

In `scripts/test/registry.test.mjs`, replace the existing test named `'client and title are required — the dashboard search reads both unguarded'` with these two:

```js
test('client may be null — adoption can skip the question', () => {
  assert.deepEqual(validateRegistry(reg([lead({ client: null })])), []);
});
test('client rejects empty and missing; title is still hard-required', () => {
  assert.match(validateRegistry(reg([lead({ client: '' })]))[0], /client/);
  assert.match(validateRegistry(reg([lead({ client: undefined })]))[0], /client/);
  const findings = validateRegistry(reg([lead({ title: undefined })]));
  assert.equal(findings.filter(f => /title/.test(f)).length, 1);
  assert.match(validateRegistry(reg([lead({ title: null })]))[0], /title/);
  assert.match(validateRegistry(reg([lead({ title: '' })]))[0], /title/);
});
```

- [ ] **Step 2: Write the failing stats tests**

Append to `scripts/test/stats.test.mjs`:

```js
test('search does not throw on a null client, and still matches id and title', () => {
  const leads = [
    { id: 'acme-crm', client: null, title: 'CRM rebuild', status: 'active' },
    { id: 'beta-shop', client: 'Beta', title: 'Shop', status: 'active' },
  ];
  assert.deepEqual(filterLeads(leads, { status: 'all', text: 'crm' }).map(l => l.id), ['acme-crm']);
  assert.deepEqual(filterLeads(leads, { status: 'all', text: 'beta' }).map(l => l.id), ['beta-shop']);
  assert.equal(filterLeads(leads, { status: 'all', text: 'zzz' }).length, 0);
});
test('sorting by client puts nulls last when ascending', () => {
  const leads = [
    { id: 'a', client: null, title: 'T', status: 'active' },
    { id: 'b', client: 'Acme', title: 'T', status: 'active' },
  ];
  assert.deepEqual(sortLeads(leads, 'client', 'asc').map(l => l.id), ['b', 'a']);
});
```

Line 3 of `stats.test.mjs` already imports all three, so no import change is needed:

```js
import { computeStats, filterLeads, sortLeads } from '../../assets/dashboard/stats.mjs';
```

- [ ] **Step 3: Run both tests to verify they fail**

```bash
node --test plugins/solution-architect/skills/new-lead/scripts/test/registry.test.mjs
node --test plugins/solution-architect/skills/new-lead/scripts/test/stats.test.mjs
```

Expected: registry fails on `client may be null` (the validator reports a finding where none is expected); stats fails with `TypeError: Cannot read properties of null (reading 'toLowerCase')`.

- [ ] **Step 4: Relax the validator**

In `scripts/lib/registry.mjs`, inside `validateLead`, replace this line:

```js
  if (!nonEmpty(lead.client)) f.push(`${at}: client must be a non-empty string`);
```

with:

```js
  if (lead.client !== null && !nonEmpty(lead.client)) {
    f.push(`${at}: client must be null or a non-empty string`);
  }
```

Leave the `title` check exactly as it is.

- [ ] **Step 5: Guard stats.mjs**

In `assets/dashboard/stats.mjs`, in `filterLeads`, replace:

```js
    const textOk = !needle || [l.id, l.client, l.title].some((v) => v.toLowerCase().includes(needle));
```

with:

```js
    const textOk = !needle || [l.id, l.client ?? '', l.title].some((v) => v.toLowerCase().includes(needle));
```

and in the `SORT_KEYS` table, replace:

```js
  client: (l) => l.client,
```

with:

```js
  // '￿' sorts above every printable character, so an unnamed client lands last
  // ascending — and first descending, exactly like every other key's reversal.
  client: (l) => l.client ?? '￿',
```

Bump the stamp on line 2 of `stats.mjs` from `// new-lead-dashboard v1` to `// new-lead-dashboard v2`.

- [ ] **Step 6: Add the upsert default**

In `scripts/lead-upsert.mjs`, replace:

```js
const DEFAULTS = { status: 'active', closed: null, value: null, scenario: null };
```

with:

```js
const DEFAULTS = { client: null, status: 'active', closed: null, value: null, scenario: null };
```

- [ ] **Step 7: Run the tests to verify they pass**

```bash
node --test plugins/solution-architect/skills/new-lead/scripts/test/
```

Expected: all PASS. `lead-upsert.test.mjs` must still pass — it supplies `client` explicitly, so the new default never applies there.

- [ ] **Step 8: Commit**

```bash
git add plugins/solution-architect/skills/new-lead
git commit -m "feat(new-lead): allow a lead with no client name"
```

---

## Task 3: Add `leadDir()` and route `enrich.mjs` through it

One helper is the only place the `leads/` layout is written down. Introducing it before the layout changes means later tasks are one-line edits rather than path surgery.

**Files:**
- Modify: `plugins/solution-architect/skills/new-lead/scripts/lib/registry.mjs`
- Modify: `plugins/solution-architect/skills/new-lead/scripts/lib/enrich.mjs:2,6`
- Test: `plugins/solution-architect/skills/new-lead/scripts/test/registry-io.test.mjs`
- Test fixtures: `plugins/solution-architect/skills/new-lead/scripts/test/fixtures/root/`

**Interfaces:**
- Consumes: `client: null` is valid (Task 2) — not used here.
- Produces: `leadDir(root: string, id: string): string` exported from `lib/registry.mjs`, returning `<root>/leads/<id>`. Tasks 4–6 import it. Nothing may call `join(root, id)` for a lead directory after this task.

- [ ] **Step 1: Move the test fixtures under `leads/`**

The fixture root must match the new layout before any test can assert it.

```bash
cd plugins/solution-architect/skills/new-lead/scripts/test/fixtures/root
mkdir leads
git mv acme-crm leads/acme-crm
cd -
```

`leads.json` stays at `fixtures/root/leads.json`.

- [ ] **Step 2: Add an evidence file to the fixture**

Task 6 derives evidence nodes from real files, so the fixture needs one that is not a generated artifact.

```bash
cat > plugins/solution-architect/skills/new-lead/scripts/test/fixtures/root/leads/acme-crm/rfp.md <<'EOF'
# Acme CRM — Request for Proposal

Acme needs to replace an aging spreadsheet-based sales process.
EOF
```

- [ ] **Step 3: Write the failing test**

Append to `scripts/test/registry-io.test.mjs`:

```js
test('leadDir places a lead under the root leads/ directory', () => {
  assert.equal(leadDir('/srv/pipeline', 'acme-crm'), '/srv/pipeline/leads/acme-crm');
});
```

Extend that file's import on line 7 to include `leadDir`:

```js
import { findLeadsRoot, readRegistry, writeRegistry, leadDir } from '../lib/registry.mjs';
```

- [ ] **Step 4: Run it to verify it fails**

```bash
node --test plugins/solution-architect/skills/new-lead/scripts/test/registry-io.test.mjs
```

Expected: FAIL — `leadDir is not a function` (or a SyntaxError about the missing export).

- [ ] **Step 5: Implement `leadDir`**

In `scripts/lib/registry.mjs`, directly below the `REGISTRY_FILE` constant, add:

```js
const LEADS_DIR = 'leads';

// The single place the on-disk layout is encoded: every lead lives under
// <root>/leads/<id>, and <root>/scripts holds the dashboard. Callers that join
// root and id themselves will silently read the wrong path.
export function leadDir(root, id) {
  return join(root, LEADS_DIR, id);
}
```

Bump the stamp on line 6 of `registry.mjs` from `// new-lead-dashboard v1` to `// new-lead-dashboard v2`.

- [ ] **Step 6: Route `enrich.mjs` through it**

Replace the whole of `scripts/lib/enrich.mjs` with:

```js
// scripts/lib/enrich.mjs
// new-lead-dashboard v2
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { leadDir } from './registry.mjs';

export async function enrichLead(root, lead) {
  const dir = leadDir(root, lead.id);
  const dist = join(dir, 'dist');
  return {
    ...lead,
    artifacts: {
      docs: existsSync(join(dist, 'index.html')),
      estimate: existsSync(join(dist, 'estimate.html')),
      proposal: existsSync(join(dist, 'proposal.html')),
    },
    hasBrief: existsSync(join(dir, 'brief.md')),
    hasNotes: existsSync(join(dir, 'notes.md')),
  };
}
```

- [ ] **Step 7: Run the registry, registry-io and enrich tests**

```bash
node --test plugins/solution-architect/skills/new-lead/scripts/test/registry.test.mjs \
            plugins/solution-architect/skills/new-lead/scripts/test/registry-io.test.mjs \
            plugins/solution-architect/skills/new-lead/scripts/test/enrich.test.mjs
```

Expected: all PASS. `enrich.test.mjs` needs no edit — it reads the fixture root, and the fixture moved to match. `map.test.mjs` and `serve.test.mjs` will now fail; Tasks 5 and 6 fix them.

- [ ] **Step 8: Commit**

```bash
git add plugins/solution-architect/skills/new-lead
git commit -m "feat(new-lead): encode the leads/ layout in one helper"
```

---

## Task 4: Rebuild the root tree in `init-root.mjs`

The copy table gains a destination, because source layout and root layout now differ: `assets/dashboard/index.html` lands at `<root>/scripts/index.html`, while `start.sh` stays at the root.

**Files:**
- Modify: `plugins/solution-architect/skills/new-lead/scripts/init-root.mjs`
- Modify: `plugins/solution-architect/skills/new-lead/assets/dashboard/start.sh`
- Test: `plugins/solution-architect/skills/new-lead/scripts/test/init-root.test.mjs`

**Interfaces:**
- Consumes: nothing from Tasks 2–3.
- Produces: `ASSET_FILES` and `SCRIPT_FILES` are now arrays of `{from: string, to: string}` rather than strings. `initRoot(root, assetsDir)` still returns `{created: boolean, copied: string[]}`, but `copied` now holds destination-relative paths (`'scripts/index.html'`, not `'index.html'`). Task 5's e2e test reads these.

- [ ] **Step 1: Write the failing test**

In `scripts/test/init-root.test.mjs`, replace the first test and the `ALL_FILES` constant. The constant becomes:

```js
const ALL_FILES = [...ASSET_FILES, ...SCRIPT_FILES].map((f) => f.to);
```

And replace the test named `'creates leads.json and copies assets on fresh root'` with:

```js
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
```

Also update `makeAssets` so its synthetic `start.sh` matches the new command:

```js
  await writeFile(join(dir, 'start.sh'), `# new-lead-dashboard v${stamp}\nnode scripts/serve.mjs "$@"\n`);
```

And in the test named `'every file init-root copies carries a stamp init-root can actually read'`, the two `.map` calls must read `.from`:

```js
  const sources = [...ASSET_FILES.map((f) => join(REAL_ASSETS, f.from)),
    ...SCRIPT_FILES.map((f) => join(REAL_SCRIPTS, f.from))];
```

And in `'missing asset files are skipped, not fatal'`, the filter must compare destinations:

```js
  const assetDests = ASSET_FILES.map((f) => f.to);
  assert.deepEqual(res.copied.filter(r => assetDests.includes(r)), []);
```

- [ ] **Step 2: Run it to verify it fails**

```bash
node --test plugins/solution-architect/skills/new-lead/scripts/test/init-root.test.mjs
```

Expected: FAIL — `ASSET_FILES.map is not a function` on strings, or `scripts/index.html` not found.

- [ ] **Step 3: Rewrite the copy table and `initRoot`**

In `scripts/init-root.mjs`, replace the two exported constants and `initRoot` with:

```js
export const ASSET_FILES = [
  { from: 'index.html', to: 'scripts/index.html' },
  { from: 'detail.html', to: 'scripts/detail.html' },
  { from: 'stats.mjs', to: 'scripts/stats.mjs' },
  { from: 'vendor/reactflow-bundle.js', to: 'scripts/vendor/reactflow-bundle.js' },
  { from: 'start.sh', to: 'start.sh' },
];
export const SCRIPT_FILES = [
  { from: 'serve.mjs', to: 'scripts/serve.mjs' },
  { from: 'lib/registry.mjs', to: 'scripts/lib/registry.mjs' },
  { from: 'lib/enrich.mjs', to: 'scripts/lib/enrich.mjs' },
  { from: 'lib/map.mjs', to: 'scripts/lib/map.mjs' },
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
```

`copyIfNewer`, `ensureRegistry` and `stampOf` are unchanged — `copyIfNewer` already takes the destination-relative path as its third argument.

- [ ] **Step 4: Update `start.sh`**

Replace the whole of `assets/dashboard/start.sh` with:

```sh
#!/bin/sh
# new-lead-dashboard v2
cd "$(dirname "$0")" && exec node scripts/serve.mjs "$@"
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
node --test plugins/solution-architect/skills/new-lead/scripts/test/init-root.test.mjs
```

Expected: PASS, including the nine-file assertion — the set is still nine files, only their destinations changed.

- [ ] **Step 6: Commit**

```bash
git add plugins/solution-architect/skills/new-lead
git commit -m "feat(new-lead): build the leads/ and scripts/ root tree"
```

---

## Task 5: Repath the dashboard server

Every path `serve.mjs` touches moves. The security tests are the valuable part of this file and must keep passing unchanged in intent — a symlink out of `dist/` is still a 403, it just lives one directory deeper now.

**Files:**
- Modify: `plugins/solution-architect/skills/new-lead/scripts/serve.mjs`
- Test: `plugins/solution-architect/skills/new-lead/scripts/test/serve.test.mjs`
- Test: `plugins/solution-architect/skills/new-lead/scripts/test/e2e-workspace.test.mjs`

**Interfaces:**
- Consumes: `leadDir(root, id)` from Task 3; `initRoot`'s `{from, to}` table from Task 4.
- Produces: URL contract — `/` and `/detail/<id>` serve from `<root>/scripts/`; `/leads/<id>/dist/*`, `/scripts/stats.mjs` and `/scripts/vendor/*` are the only allowlisted static paths. Task 7's HTML must use exactly these.

- [ ] **Step 1: Update the test setup to the new layout**

In `scripts/test/serve.test.mjs`, the `before` hook writes stand-ins at the old flat paths. Replace its body with:

```js
  root = await mkdtemp(join(tmpdir(), 'srv-'));      // copy fixture so POSTs don't dirty it
  await cp(new URL('./fixtures/root', import.meta.url).pathname, root, { recursive: true });
  // stats.mjs and vendor/* aren't part of the shared fixture — write minimal stand-ins
  // under scripts/ so the allowlist has something to serve.
  await mkdir(join(root, 'scripts', 'vendor'), { recursive: true });
  await writeFile(join(root, 'scripts', 'stats.mjs'), 'export const x = 1;\n');
  await writeFile(join(root, 'scripts', 'vendor', 'reactflow-bundle.js'), '// stub\n');
  server = await startServer(root, 0);
  base = `http://127.0.0.1:${server.address().port}`;
```

- [ ] **Step 2: Repath every URL and filesystem path in the serve tests**

Apply these substitutions throughout `scripts/test/serve.test.mjs`:

| Old | New |
| --- | --- |
| `${base}/acme-crm/dist/` | `${base}/leads/acme-crm/dist/` |
| `${base}/acme-crm/notes.md` | `${base}/leads/acme-crm/notes.md` |
| `${base}/acme-crm/new-lead-answers.json` | `${base}/leads/acme-crm/new-lead-answers.json` |
| `${base}/acme-crm/brief.md` | `${base}/leads/acme-crm/brief.md` |
| `${base}/acme-crm/..%2F...` | `${base}/leads/acme-crm/..%2F...` |
| `${base}/stats.mjs` | `${base}/scripts/stats.mjs` |
| `${base}/vendor/reactflow-bundle.js` | `${base}/scripts/vendor/reactflow-bundle.js` |
| `${base}/vendor/` | `${base}/scripts/vendor/` |
| `join(root, 'acme-crm', …)` | `join(root, 'leads', 'acme-crm', …)` |
| `join(root, name)` for index/detail.html | `join(root, 'scripts', name)` |
| `join(root, 'ghost-lead')` | `join(root, 'leads', 'ghost-lead')` |

Then add one test that pins the new refusals — the `scripts/` tree must not become readable just because it is inside the root:

```js
test('the scripts tree is not browsable beyond the two allowlisted entries', async () => {
  assert.equal((await fetch(`${base}/scripts/serve.mjs`)).status, 404);
  assert.equal((await fetch(`${base}/scripts/lib/registry.mjs`)).status, 404);
  assert.equal((await fetch(`${base}/scripts/index.html`)).status, 404);
  assert.equal((await fetch(`${base}/leads.json`)).status, 404);
});
```

The test named `'GET / 404s cleanly when index.html has not been built yet'` still holds — the fixture root has no `scripts/index.html`, so `/` still 404s.

- [ ] **Step 3: Update the e2e workspace test**

In `scripts/test/e2e-workspace.test.mjs`, replace the three assertions and the `cp` destination:

```js
  assert.ok(existsSync(join(root, 'scripts', 'serve.mjs')), 'server copied');
  assert.ok(existsSync(join(root, 'scripts', 'index.html')), 'dashboard copied');
  assert.equal(findLeadsRoot(join(root)), root);

  // simulate the pipeline having produced a lead dir
  await cp(FIXTURE_LEAD, join(root, 'leads', 'acme-crm'), { recursive: true });
```

and update `FIXTURE_LEAD` at the top of the file:

```js
const FIXTURE_LEAD = new URL('./fixtures/root/leads/acme-crm', import.meta.url).pathname;
```

- [ ] **Step 4: Run both tests to verify they fail**

```bash
node --test plugins/solution-architect/skills/new-lead/scripts/test/serve.test.mjs \
            plugins/solution-architect/skills/new-lead/scripts/test/e2e-workspace.test.mjs
```

Expected: FAIL — `/leads/acme-crm/dist/index.html` returns 404 (the allowlist still expects the old shape), and `GET /` returns 404 in the e2e test because `serveFile` looks at `<root>/index.html`.

- [ ] **Step 5: Repath `serve.mjs`**

Four edits. First, the static-path constants near the top — replace:

```js
const ID = ID_RE.source.slice(1, -1);
const DIST_RE = new RegExp(`^/(${ID})/dist/`);
```

with:

```js
const ID = ID_RE.source.slice(1, -1);
const DIST_RE = new RegExp(`^/leads/(${ID})/dist/`);
const SCRIPTS_DIR = 'scripts';
```

Second, the two page routes — replace their handlers:

```js
  ['GET', /^\/$/, ({ root }, req, res) => serveFile(root, res, 'index.html')],
  ['GET', new RegExp(`^/detail/(${ID})$`), ({ root }, req, res) => serveFile(root, res, 'detail.html')],
```

with:

```js
  ['GET', /^\/$/, ({ root }, req, res) => serveFile(root, res, join(SCRIPTS_DIR, 'index.html'))],
  ['GET', new RegExp(`^/detail/(${ID})$`), ({ root }, req, res) => serveFile(root, res, join(SCRIPTS_DIR, 'detail.html'))],
```

`serveFile` itself is unchanged — it already does `join(root, name)` and compares `realpath` against that exact target, which still holds for a nested name.

Third, the allowlist — replace:

```js
function isAllowlisted(decoded) {
  return decoded === '/stats.mjs' || decoded.startsWith('/vendor/') || DIST_RE.test(decoded);
}
```

with:

```js
function isAllowlisted(decoded) {
  return decoded === '/scripts/stats.mjs'
    || decoded.startsWith('/scripts/vendor/')
    || DIST_RE.test(decoded);
}
```

Fourth, `apiNotes` — replace:

```js
  try { dir = await realpath(join(root, id)); } catch { return send(res, 404, { error: 'not found' }); }
```

with:

```js
  try { dir = await realpath(leadDir(root, id)); } catch { return send(res, 404, { error: 'not found' }); }
```

and extend the `lib/registry.mjs` import at the top of the file to include `leadDir`:

```js
import { findLeadsRoot, readRegistry, writeRegistry, leadDir, STATUSES, ID_RE } from './lib/registry.mjs';
```

Bump the stamp on line 2 of `serve.mjs` to `// new-lead-dashboard v2`.

- [ ] **Step 6: Run the tests to verify they pass**

```bash
node --test plugins/solution-architect/skills/new-lead/scripts/test/serve.test.mjs \
            plugins/solution-architect/skills/new-lead/scripts/test/e2e-workspace.test.mjs
```

Expected: PASS, **except** the two `map` assertions (`GET /api/leads/:id/map`) — `map.mjs` still reads the old path. Task 6 fixes those. If any *security* test fails (symlink, traversal, allowlist), stop: the guard has regressed and that is not something Task 6 will fix.

- [ ] **Step 7: Commit**

```bash
git add plugins/solution-architect/skills/new-lead
git commit -m "feat(new-lead): serve the dashboard from the new root layout"
```

---

## Task 6: Rewire the lead map onto real files

`new-lead-answers.json` no longer exists. The interview node goes with it, evidence comes from the files the human dropped in the lead folder, and the facts panel is built from the registry entry.

**Files:**
- Modify: `plugins/solution-architect/skills/new-lead/scripts/lib/map.mjs`
- Test: `plugins/solution-architect/skills/new-lead/scripts/test/map.test.mjs`
- Delete: `plugins/solution-architect/skills/new-lead/scripts/test/fixtures/root/leads/acme-crm/new-lead-answers.json`

**Interfaces:**
- Consumes: `leadDir(root, id)` from Task 3.
- Produces: `buildLeadMap(root, id)` returns `{nodes, edges, panels}` where `panels.facts` is now `{client: string|null, title: string, status: string, created: string, value: object|null, scenario: string|null}` — the registry entry's own shape, not an answers-file group. Task 7's `renderFacts` consumes exactly this.

- [ ] **Step 1: Write the failing tests**

In `scripts/test/map.test.mjs`, replace the test named `'nodes for every pipeline stage with disk-truth status'` and the one named `'panels carry brief, risks, open questions'` with:

```js
test('no interview node; evidence feeds architecture directly', async () => {
  const m = await buildLeadMap(ROOT, 'acme-crm');
  assert.equal(byId(m, 'interview'), undefined, 'the interview node is gone');
  assert.equal(byId(m, 'arch').data.status, 'ready');
  assert.equal(byId(m, 'arch').data.href, '/leads/acme-crm/dist/index.html');
  assert.equal(byId(m, 'estimate').data.status, 'ready');     // estimation.json exists
  assert.equal(byId(m, 'estimate').data.href, null);           // estimate.html absent
  assert.equal(byId(m, 'proposal').data.status, 'pending');
  const evidence = m.nodes.filter((n) => n.type === 'evidence');
  assert.ok(evidence.length > 0, 'evidence nodes exist');
  assert.ok(m.edges.some((e) => e.source === evidence[0].id && e.target === 'arch'),
    'evidence links straight to architecture');
});
test('evidence is the human-dropped files, never the generated artifacts', async () => {
  const m = await buildLeadMap(ROOT, 'acme-crm');
  const labels = m.nodes.filter((n) => n.type === 'evidence').map((n) => n.data.label);
  assert.deepEqual(labels, ['rfp.md']);
  for (const generated of ['ARCHITECTURE.md', 'estimation.json', 'brief.md', 'notes.md', 'dist']) {
    assert.ok(!labels.includes(generated), `${generated} must not be listed as evidence`);
  }
});
test('facts panel is the registry entry, not an answers file', async () => {
  const m = await buildLeadMap(ROOT, 'acme-crm');
  assert.equal(m.panels.facts.client, 'Acme Corp');
  assert.equal(m.panels.facts.title, 'CRM Rebuild');
  assert.equal(m.panels.facts.status, 'active');
  assert.equal(m.panels.facts.created, '2026-07-01');
  assert.match(m.panels.brief, /Acme/);
  assert.deepEqual(m.panels.risks, ['Legacy data migration', 'SSO unknowns']);
  assert.deepEqual(m.panels.openQuestions, ['Reporting']);
});
```

Those four values are copied from the `acme-crm` entry in `fixtures/root/leads.json`. Do not change the fixture to suit the test.

- [ ] **Step 2: Run it to verify it fails**

```bash
node --test plugins/solution-architect/skills/new-lead/scripts/test/map.test.mjs
```

Expected: FAIL — the interview node still exists, and `m.panels.facts.title` is `undefined`.

- [ ] **Step 3: Delete the answers fixture**

```bash
git rm plugins/solution-architect/skills/new-lead/scripts/test/fixtures/root/leads/acme-crm/new-lead-answers.json
```

- [ ] **Step 4: Rewrite the source-reading half of `map.mjs`**

In `scripts/lib/map.mjs`, replace the imports, the `X` table, `buildLeadMap`, `readSources`, `evidenceNodes` and `interviewNode` with:

```js
// scripts/lib/map.mjs
// new-lead-dashboard v2
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';
import { leadDir, readRegistry } from './registry.mjs';

const run = promisify(execFile);
const X = { evidence: 0, arch: 480, estimate: 720, proposal: 960 };
const STEP_Y = 90;

// Everything the three skills write. What is left in the lead directory is what
// the human put there, which is exactly the evidence.
const GENERATED = new Set([
  'ARCHITECTURE.md', 'estimation.md', 'estimation.json', 'estimation-inputs.json',
  'proposal.md', 'proposal-figures.json', 'notes.md', 'brief.md', 'dist',
]);

export async function buildLeadMap(root, id) {
  const dir = leadDir(root, id);
  const src = await readSources(dir);
  const nodes = [...await evidenceNodes(dir), ...docNodes(id, dir, src)];
  layout(nodes);
  return { nodes, edges: edgesFor(nodes), panels: await panelsFor(root, id, src) };
}

async function readSources(dir) {
  const [arch, estimation, inputs, brief] = await Promise.all([
    readText(join(dir, 'ARCHITECTURE.md')),
    readJson(join(dir, 'estimation.json')),
    readJson(join(dir, 'estimation-inputs.json')),
    readText(join(dir, 'brief.md')),
  ]);
  return { arch, estimation, inputs, brief };
}

function isEvidence(entry) {
  return !entry.name.startsWith('.')
    && !GENERATED.has(entry.name)
    && !entry.name.endsWith('.c4');
}

async function evidenceNodes(dir) {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  return entries.filter(isEvidence).map((entry) => ({
    id: `evidence-${entry.name}`,
    type: 'evidence',
    position: { x: 0, y: 0 },
    data: { label: entry.name, status: 'ready', href: null, detail: null },
  }));
}
```

`readJson` and `readText` keep their current definitions. Delete `interviewNode` entirely.

- [ ] **Step 5: Repath the doc hrefs and drop the interview edge**

In `docNode`, replace the `href` expression:

```js
  const href = spec.exists && existsSync(join(dir, 'dist', spec.page))
    ? `/leads/${id}/dist/${spec.page}` : null;
```

In `edgesFor`, replace the first two entries of the returned array:

```js
    ...byPrefix('evidence-').flatMap((n) => link(n.id, 'arch')),
```

(that single line replaces both the `evidence- → interview` line and the `interview → arch` line).

In `colX`, delete the `interview` branch:

```js
function colX(n) {
  if (n.id.startsWith('evidence-')) return X.evidence;
  if (n.id === 'arch') return X.arch;
  if (n.id.startsWith('component-')) return X.arch + 40;
  if (n.id === 'estimate') return X.estimate;
  if (n.id.startsWith('scenario-')) return X.estimate + 40;
  return X.proposal;
}
```

- [ ] **Step 6: Rebuild the facts panel on the registry**

Replace `panelsFor` and the comment above it with:

```js
// facts is the registry entry itself — business metadata the dashboard displays.
// It is the only source for these fields now that the answers file is gone.
async function factsFor(root, id) {
  const registry = await readRegistry(root).catch(() => ({ leads: [] }));
  const lead = registry.leads.find((l) => l.id === id);
  if (!lead) return null;
  const { client, title, status, created, value, scenario } = lead;
  return { client, title, status, created, value, scenario };
}

async function panelsFor(root, id, src) {
  return {
    brief: src.brief ?? null,
    facts: await factsFor(root, id),
    risks: risksFor(src.estimation),
    openQuestions: openQuestionsFor(src.inputs),
    activity: await activityFor(root, id),
  };
}
```

In `activityFor`, the git path filter must follow the lead into `leads/`:

```js
    const { stdout } = await run('git', ['-C', root, 'log', '--format=%as %s', '--', join('leads', id)]);
```

- [ ] **Step 7: Run the map, serve and e2e tests**

```bash
node --test plugins/solution-architect/skills/new-lead/scripts/test/map.test.mjs \
            plugins/solution-architect/skills/new-lead/scripts/test/serve.test.mjs \
            plugins/solution-architect/skills/new-lead/scripts/test/e2e-workspace.test.mjs
```

Expected: all PASS, including the `map` assertions Task 5 left failing. The `'sparse lead dir degrades to pending nodes, empty panels'` test still passes — `ghost` has no directory, `readdir` catches to `[]`, and `factsFor` returns `null` for an id absent from the registry.

- [ ] **Step 8: Check the file against the quality gates**

```bash
wc -l plugins/solution-architect/skills/new-lead/scripts/lib/map.mjs
```

Expected: under 200. If it is over, extract the node-building helpers into `scripts/lib/map-nodes.mjs` and import them.

- [ ] **Step 9: Commit**

```bash
git add plugins/solution-architect/skills/new-lead
git commit -m "feat(new-lead): build the lead map from files instead of an answers record"
```

---

## Task 7: Update the two dashboard pages

The HTML consumes the URL contract from Task 5 and the `panels.facts` shape from Task 6. These are browser files with no unit tests; verification is a real page load through the server.

**Files:**
- Modify: `plugins/solution-architect/skills/new-lead/assets/dashboard/index.html`
- Modify: `plugins/solution-architect/skills/new-lead/assets/dashboard/detail.html`
- Test: `plugins/solution-architect/skills/new-lead/scripts/test/e2e-workspace.test.mjs`

**Interfaces:**
- Consumes: `/leads/<id>/dist/*` and `/scripts/vendor/*` (Task 5); `panels.facts = {client, title, status, created, value, scenario}` (Task 6).
- Produces: nothing downstream.

- [ ] **Step 1: Write the failing assertion**

In `scripts/test/e2e-workspace.test.mjs`, inside the existing `try` block, after the two-page loop, add:

```js
    // the rendered dashboard must link artifacts at their real URLs, and must not
    // reference the pre-layout flat paths
    const home = await (await fetch(`${base}/`)).text();
    assert.doesNotMatch(home, /["'`]\/\$\{id\}\/dist\//, 'card hrefs still use the flat layout');
    const detail = await (await fetch(`${base}/detail/acme-crm`)).text();
    assert.match(detail, /\/scripts\/vendor\//, 'detail page loads vendor from scripts/');
```

- [ ] **Step 2: Run it to verify it fails**

```bash
node --test plugins/solution-architect/skills/new-lead/scripts/test/e2e-workspace.test.mjs
```

Expected: FAIL on the first assertion — `index.html` still builds `/${id}/dist/index.html`.

- [ ] **Step 3: Repath the artifact links in `index.html`**

In `cardTemplate`, replace the three `artifactChip` calls:

```js
        ${artifactChip(l.artifacts.docs, `/leads/${id}/dist/index.html`, 'Docs')}
        ${artifactChip(l.artifacts.estimate, `/leads/${id}/dist/estimate.html`, 'Estimate')}
        ${artifactChip(l.artifacts.proposal, `/leads/${id}/dist/proposal.html`, 'Proposal')}
```

Search the rest of the file for any other `/${id}/dist/` or `/${esc(l.id)}/dist/` occurrence (the wall and timeline views may build their own links) and give each the same `/leads` prefix.

- [ ] **Step 4: Render a null client in `index.html`**

Add a helper next to `esc`:

```js
// A lead may have no client name until /proposal supplies one.
const clientName = (l) => l.client ?? '—';
```

Then replace the three read sites:

```js
      <p class="card-client">${esc(clientName(l))}</p>
```

```js
      <span class="t-info"><strong>${esc(clientName(l))}</strong> ${esc(l.title)}${statusBadge(l.status)}</span>
```

```js
  { label: 'Client', sort: 'client', cell: (l) => esc(clientName(l)) },
```

Bump line 2 of `index.html` from `<!-- new-lead-dashboard v1 -->` to `<!-- new-lead-dashboard v2 -->`.

- [ ] **Step 5: Rebuild `renderFacts` in `detail.html`**

Replace the comment and the whole `renderFacts` function with:

```js
// facts is the registry entry — the only business metadata the dashboard has now
// that the answers file is gone. A lead with no client yet shows an em dash.
function renderFacts(facts) {
  const dl = document.getElementById('facts-dl');
  dl.replaceChildren();
  if (!facts) return;
  factRow(dl, 'Client', facts.client ?? '—');
  factRow(dl, 'Title', facts.title);
  factRow(dl, 'Created', facts.created);
  factRow(dl, 'Scenario', facts.scenario ?? '—');
  document.getElementById('tech-chips').replaceChildren();
}
```

and update its one caller in `renderPanels`:

```js
  renderFacts(panels.facts);
```

- [ ] **Step 6: Remove the dead validity branch and repath vendor**

In `computeBanner`, delete this line and the `if` that reads it:

```js
  const validityDays = panels.facts?.proposal?.validityDays;
  if (proposal?.data.status === 'ready' && validityDays != null) return `validity expires in ${validityDays}d`;
```

`map.mjs` never set `facts.proposal`, so this branch has never fired. Removing it leaves `computeBanner` reading:

```js
function computeBanner(lead, panels, nodes) {
  if (lead.closed) return `${lead.status} on ${lead.closed}`;
  const pending = nodes.find((n) => n.data.status === 'pending');
  if (!pending) return null;
  const gate = gateFor(pending);
  return `waiting: ${pending.data.label} (gate ${gate ?? '?'})`;
}
```

`PROPOSAL_ID` (line 451) is referenced only by the deleted branch, so delete its declaration too:

```js
const PROPOSAL_ID = 'proposal';
```

Verify before deleting:

```bash
grep -c "PROPOSAL_ID" plugins/solution-architect/skills/new-lead/assets/dashboard/detail.html
```

Expected after the branch is removed: `1` (the declaration alone). If it is higher, something else uses it — leave it.

`GATES` (line 450) is `{ arch: 1, estimate: 2, scenario: 2, proposal: 3 }` — it has no `interview` key, so it needs no change.

Then repath the React Flow bundle. It is a plain script tag on line 447, not a dynamic import:

```html
<script src="/scripts/vendor/reactflow-bundle.js"></script>
```

Bump line 2 of `detail.html` from `<!-- new-lead-dashboard v1 -->` to `<!-- new-lead-dashboard v2 -->`.

- [ ] **Step 7: Run the full suite**

```bash
node --test plugins/solution-architect/skills/new-lead/scripts/test/
```

Expected: all PASS, `fail 0`.

- [ ] **Step 8: Load both pages in a real browser**

The unit tests cannot catch a JS error inside the page.

```bash
cd /tmp && rm -rf lead-smoke && mkdir lead-smoke && cd -
node plugins/solution-architect/skills/new-lead/scripts/init-root.mjs --root /tmp/lead-smoke
cp -r plugins/solution-architect/skills/new-lead/scripts/test/fixtures/root/leads/acme-crm /tmp/lead-smoke/leads/
node plugins/solution-architect/skills/new-lead/scripts/lead-upsert.mjs --root /tmp/lead-smoke \
  --id acme-crm --patch '{"title":"CRM rebuild","created":"2026-08-07"}'
sh /tmp/lead-smoke/start.sh --port 4611
```

Open `http://127.0.0.1:4611/` and `http://127.0.0.1:4611/detail/acme-crm`. Both must render with an empty browser console. The card must show `—` for the client (the patch deliberately omitted it), the Docs chip must link to `/leads/acme-crm/dist/index.html`, and the detail page's lineage canvas must draw with no interview node. Stop the server with Ctrl-C.

- [ ] **Step 9: Commit**

```bash
git add plugins/solution-architect/skills/new-lead
git commit -m "feat(new-lead): repath and rewire the dashboard pages"
```

---

## Task 8: Rewrite `/new-lead` as a launcher

The behavioural change. `SKILL.md` is the contract; everything the launcher no longer does gets deleted rather than left to rot.

**Files:**
- Rewrite: `plugins/solution-architect/skills/new-lead/SKILL.md`
- Rewrite: `plugins/solution-architect/skills/new-lead/README.md`
- Delete: `plugins/solution-architect/skills/new-lead/references/` (4 files, 643 lines)
- Modify: `plugins/solution-architect/skills/analyze-requirements/SKILL.md` — delete the `## Orchestrated mode` section
- Modify: `plugins/solution-architect/skills/estimate/SKILL.md` — delete the `## Orchestrated mode` section
- Modify: `plugins/solution-architect/skills/proposal/SKILL.md` — delete the `## Orchestrated mode` section

**Interfaces:**
- Consumes: everything from Tasks 1–7 — the skill name `analyze-requirements`, `leadDir`, the new root tree, nullable `client`.
- Produces: the launcher contract. Nothing downstream.

- [ ] **Step 1: Delete the unreachable references**

```bash
git rm plugins/solution-architect/skills/new-lead/references/interview.md \
       plugins/solution-architect/skills/new-lead/references/workflows.md \
       plugins/solution-architect/skills/new-lead/references/answers-schema.md \
       plugins/solution-architect/skills/new-lead/references/review-lenses.md
```

- [ ] **Step 2: Delete the three `Orchestrated mode` sections**

Each begins at a line reading `## Orchestrated mode` and ends at the line before the next `## ` heading, or at end of file. In `analyze-requirements/SKILL.md` it currently starts at line 33; in `estimate/SKILL.md` at line 67; in `proposal/SKILL.md` at line 60. Open each file, confirm the boundary, and delete the section including its heading.

Each section activates only when the caller supplies a `new-lead-answers.json` path. Nothing produces that file after this task, so every one of them is dead.

Then confirm no reference survives anywhere:

```bash
grep -rn "new-lead-answers\|Orchestrated mode" plugins/solution-architect/skills/ --include='*.md' --include='*.mjs'
```

Expected: no output.

- [ ] **Step 3: Write the new SKILL.md**

Replace the entire contents of `plugins/solution-architect/skills/new-lead/SKILL.md` with:

````markdown
---
name: new-lead
description: Set up a pre-sales lead workspace and walk the human through the three solution-architect skills in order — analyze-requirements, estimate, proposal — plus a local leads dashboard. Use when the user says "new lead", points at a folder under leads/, or asks to see their leads pipeline.
---

# new-lead

Prepare a lead's workspace, then run `/analyze-requirements`, `/estimate` and
`/proposal` in that order, stopping between each so the human sees what was
produced. Also maintains the leads dashboard: a `leads.json` registry and a
self-contained local server.

## Hard rules

1. This skill never interviews. Every question about scope, stack, delivery or
   the client belongs to the skill that needs it.
2. This skill never renders and never writes a document. Each sub-skill owns its
   own validation and its own output.
3. The lead id is the folder name under `leads/`, verbatim. The filesystem is
   the source of truth; `leads.json` holds business metadata only, and is
   written exclusively through `scripts/lead-upsert.mjs`.
4. Stop after each sub-skill returns. The human decides whether the chain
   continues.

## Workspace

```
<root>/
├── leads.json          the registry
├── start.sh            starts the dashboard
├── leads/<lead-id>/    one directory per lead
└── scripts/            serve.mjs, the dashboard pages, lib/, vendor/
```

## Flow

1. **Dependency check**: Node ≥ 20 and `npx likec4` (needed downstream by
   `analyze-requirements`). Either missing → stop before doing any work.
2. **Find the root**: walk up from the working directory for `leads.json`
   (`findLeadsRoot` in `scripts/lib/registry.mjs`). Not found → confirm with the
   user, then `node scripts/init-root.mjs --root <dir>` at cwd, and offer
   `git init`.
3. **Resolve the target**:
   - `/new-lead @leads/<folder>/` → that folder.
   - `/new-lead` with no argument → diff `readdir(<root>/leads)` against
     `leads.json` and print the state table below; the human picks one.
4. **Adopt** (only when the folder has no registry entry) — see Adoption.
5. **Chain**: for each of `/analyze-requirements`, `/estimate`, `/proposal` —
   `cd` to the lead directory, invoke the skill, and when it returns, report
   what it wrote and wait. Skip any step whose artifact already exists unless
   the human asks for a re-run.
6. **Sync the registry** after `/proposal` — see Registry sync.
7. **Wrap**: start the dashboard (`sh <root>/start.sh`) if it is not already
   running, and report the URL.

## Lead states

| State | Condition | Offer |
| --- | --- | --- |
| new | folder present, no registry entry | adopt, then run the chain |
| WIP | entry present, one of `ARCHITECTURE.md` / `estimation.json` / `proposal.md` missing | resume at the first gap |
| done | entry present, all three present | nothing; re-run a named step on request |
| orphan | entry present, folder gone | report only — never delete |

## Adoption

1. The folder name must match `^[a-z0-9]+(-[a-z0-9]+)*$`. It does not → refuse,
   print the exact `mv` command, and write nothing.
2. Ask two questions, both skippable:
   - client company name — skipped writes `null`
   - project name — skipped writes Title Case of the folder name
3. Both answered, and the folder is not already named
   `<kebab(client)>-<kebab(project)>` → offer that rename once. Accepted →
   `git mv` (plain `mv` outside a repo). Declined, or a folder of that name
   already exists → keep the current name and do not ask again.
4. Write the entry — *after* any rename, so the id can never name a folder that
   no longer exists:

   ```
   node scripts/lead-upsert.mjs --root <root> --id <folder-name> \
     --patch '{"client":<string|null>,"title":"<project>","created":"YYYY-MM-DD"}'
   ```

   `created` has no default and the registry rejects an entry without one.
5. Commit.

Ids need no collision handling: the id is the folder name, and a directory
cannot hold two entries with the same name.

## Registry sync

Runs after `/proposal`, never after `/estimate` — `/estimate` emits several
scenarios and picks none; the pick is `/proposal`'s interview.

| Field | Source |
| --- | --- |
| `scenario` | `proposal-figures.json` `.scenario` |
| `value` | `.cost.low` / `.cost.high`, currency from `proposal.md` frontmatter |
| `client` | `proposal.md` frontmatter, only when the entry's `client` is `null` |

Apply with one `lead-upsert.mjs` call, then commit.

## Failure

A sub-skill that stops short is reported as it stopped — its own error, its own
partial output, left in place. Options: fix the input and re-run that skill,
skip it, or stop the chain. Never re-run a later skill over a missing earlier
artifact; `/proposal` in particular hard-requires both `ARCHITECTURE.md` and
`estimation.json`.

## Dependency

Node ≥ 20 and `npx likec4`. Check both at step 1 and stop if either is missing.
````

- [ ] **Step 4: Write the new README.md**

Replace the entire contents of `plugins/solution-architect/skills/new-lead/README.md` with:

````markdown
# new-lead

Sets up a pre-sales lead workspace and walks you through the three
solution-architect skills in order, stopping between each so you see what was
produced before the next one starts.

```
/new-lead @leads/acme-corp-payments-rework/
   → /analyze-requirements   ARCHITECTURE.md
   → /estimate               estimation.json
   → /proposal               proposal.md
   → dashboard URL
```

Each skill runs exactly as it does standalone: its own interview, its own
validation, its own rendered page. `/new-lead` never interviews and never
writes a document.

## Workspace layout

```
<leads-root>/
├── leads.json            registry (status, value, dates)
├── start.sh              starts the dashboard
├── leads/
│   └── <lead-id>/        one directory per lead
│       ├── <your documents — the RFP, notes, anything you were sent>
│       ├── ARCHITECTURE.md, estimation.json, proposal.md
│       └── dist/         the rendered pages
└── scripts/              serve.mjs, dashboard pages, lib/, vendor/
```

## Starting a lead

Make a directory under `leads/` and run `/new-lead`. A folder with no registry
entry is a new lead; `/new-lead` with no argument lists what is new, in
progress, and finished.

Name the folder in kebab-case — it becomes the lead id verbatim.

## Dashboard quickstart

```
cd <leads-root>
./start.sh
```

Serves on `127.0.0.1:4600` (override with `--port <n>`) with no agent running.
````

- [ ] **Step 5: Verify no stale reference survives**

```bash
grep -rn "Workflow ARCH\|Gate 1\|Gate 2\|Gate 3\|brief-writer\|resumeFromRunId\|combined interview" \
  plugins/solution-architect/skills/new-lead/
```

Expected: no output. Any hit is prose describing machinery this task removed.

- [ ] **Step 6: Run the full suite one last time**

```bash
node --test plugins/solution-architect/skills/new-lead/scripts/test/
node --test plugins/solution-architect/skills/analyze-requirements/scripts/test/
node --test plugins/solution-architect/skills/estimate/scripts/test/
node --test plugins/solution-architect/skills/proposal/scripts/test/
node --test tests/*.test.mjs
```

Expected: `fail 0` everywhere.

- [ ] **Step 7: Walk the launcher end to end by hand**

```bash
cd /tmp && rm -rf lead-live && mkdir lead-live && cd -
node plugins/solution-architect/skills/new-lead/scripts/init-root.mjs --root /tmp/lead-live
mkdir -p /tmp/lead-live/leads/acme-corp-payments-rework
echo "# RFP" > /tmp/lead-live/leads/acme-corp-payments-rework/rfp.md
```

Then, from `/tmp/lead-live`, run `/new-lead` with no argument. It must:

1. find the root without being told,
2. report `acme-corp-payments-rework` as **new**,
3. ask for client and project name and accept both being skipped,
4. write a registry entry with `client: null` and `title: "Acme Corp Payments Rework"`,
5. stop before invoking `/analyze-requirements` and wait.

Then run `/new-lead` again and confirm it now reports the lead as **WIP** rather than offering to adopt it a second time.

- [ ] **Step 8: Commit**

```bash
git add -A plugins/solution-architect/skills
git commit -m "feat(new-lead): run the three skills in sequence instead of orchestrating them"
```

---

## Self-Review

**Spec coverage**

| Spec section | Task |
| --- | --- |
| Phase 0 rename, with three identifiers preserved | Task 1 |
| `leadDir()` helper | Task 3 |
| `client` nullable in validator | Task 2 |
| `lead-upsert` `DEFAULTS` | Task 2 |
| `init-root` builds `leads/` + `scripts/` | Task 4 |
| `start.sh` alone at root, invoking `scripts/serve.mjs` | Task 4 |
| `serve.mjs` repath and allowlist | Task 5 |
| `map.mjs` — drop answers, drop interview node, evidence from `readdir`, facts from registry | Task 6 |
| `enrich.mjs` via `leadDir` | Task 3 |
| `index.html` null client, repathed hrefs | Task 7 |
| `detail.html` facts rebuild, dead validity branch, vendor path | Task 7 |
| Discovery / adoption / chain / registry sync contract | Task 8 |
| Delete 4 references + 3 Orchestrated-mode sections | Task 8 |
| Verification per phase | Steps within each task |

**Beyond the spec:** `stats.mjs` (Task 2, steps 2 and 5). The spec listed nullable `client` as a validator and rendering change, but `filterLeads` reads `l.client.toLowerCase()` unguarded — a null client throws on every dashboard search — and `SORT_KEYS.client` has the same exposure. Without this the feature ships broken.

**Placeholders:** none. Every code step carries the literal replacement text. Manual browser and launcher checks (Task 7 step 8, Task 8 step 7) list the exact observations that constitute a pass.

**Type consistency:**

- `leadDir(root, id)` — defined Task 3 step 5, consumed Task 3 step 6, Task 5 step 5, Task 6 step 4. Same name and argument order throughout.
- `ASSET_FILES` / `SCRIPT_FILES` become `{from, to}` in Task 4 step 3; every reader is updated in Task 4 step 1 (`.from` for stamps, `.to` for destinations).
- `panels.facts` is `{client, title, status, created, value, scenario}` — produced Task 6 step 6, consumed Task 7 step 5. `renderFacts` drops to one parameter in both the definition and its caller.
- URL contract `/leads/<id>/dist/*`, `/scripts/stats.mjs`, `/scripts/vendor/*` — set in Task 5 step 5, asserted in Task 5 step 2, consumed in Task 7 steps 3 and 6.
- Stamp bumps to `v2`: `stats.mjs` (T2), `registry.mjs` and `enrich.mjs` (T3), `start.sh` (T4), `serve.mjs` (T5), `map.mjs` (T6), `index.html` and `detail.html` (T7). Every file whose content changes is covered.
