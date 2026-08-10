# Milestone 02 — Dashboard Server

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Read `00-overview.md` Global Constraints first.

**Goal:** `serve.mjs` (routes, static serving, won/lost + notes persistence) with `lib/enrich.mjs` (disk-truth artifact flags) and `lib/map.mjs` (lead-map + panels JSON).

Base dir: `plugins/solution-architect/skills/new-lead/`. Depends on milestone 01 (`lib/registry.mjs`).

**Test fixture used by every task** — create once in Task 1, reuse:

```
scripts/test/fixtures/root/
├── leads.json           {"version":1,"leads":[<acme-crm active, value null>,<beta-shop won, closed+value set>]}
└── acme-crm/
    ├── new-lead-answers.json     (minimal valid: version, lead, client{name,industry,techLevel},
    │                              scope{summary,mustHave:[..]}, tech{stack:[..]}, delivery{deadline},
    │                              evidence{sources:[{type:"rfp",path:"rfp.md",summary:"..."}]})
    ├── brief.md                  ("# Brief\nAcme wants a CRM rebuild...")
    ├── notes.md
    ├── ARCHITECTURE.md           (contains "## 6. Core Components" with a 2-row markdown table,
    │                              first column component names in backticks: `atlas.api`, `atlas.web`)
    ├── estimation.json           ({"scenarios":[{"id":"balanced","label":"Balanced"},{"id":"fast","label":"Fast"}],
    │                              "risks":[{"title":"Legacy data migration"},{"title":"SSO unknowns"}]})
    ├── estimation-inputs.json    ({"scope":[{"item":"Reporting","label":"proposed"},{"item":"Auth","label":"stated"}]})
    └── dist/
        └── index.html            (arch viewer present; estimate.html/proposal.html deliberately absent)
```

Field names inside `estimation.json` / `estimation-inputs.json`: before writing the fixture, check the estimate skill's canonical booking fixture (`plugins/solution-architect/skills/estimate/references/writing.md`) and mirror its exact key names; the shapes above are the fallback if the fixture leaves one undefined. `lib/map.mjs` reads them with tolerant accessors either way.

---

### Task 1: `lib/enrich.mjs`

**Files:**
- Create: `scripts/lib/enrich.mjs`, the fixture tree above
- Test: `scripts/test/enrich.test.mjs`

**Interfaces:**
- Produces: `enrichLead(root, lead) -> Promise<lead & {artifacts:{docs,estimate,proposal}, hasBrief, hasNotes}>`

- [ ] **Step 1: Write failing test**

```js
// scripts/test/enrich.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { enrichLead } from '../lib/enrich.mjs';

const ROOT = new URL('./fixtures/root', import.meta.url).pathname;

test('artifact flags reflect dist/ disk truth', async () => {
  const e = await enrichLead(ROOT, { id: 'acme-crm' });
  assert.deepEqual(e.artifacts, { docs: true, estimate: false, proposal: false });
  assert.equal(e.hasBrief, true);
  assert.equal(e.hasNotes, true);
});
test('missing lead dir -> all false', async () => {
  const e = await enrichLead(ROOT, { id: 'ghost' });
  assert.deepEqual(e.artifacts, { docs: false, estimate: false, proposal: false });
});
```

- [ ] **Step 2: Run to verify failure** — FAIL: module missing.

- [ ] **Step 3: Implement**

```js
// scripts/lib/enrich.mjs
// new-lead-dashboard v1
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export async function enrichLead(root, lead) {
  const dir = join(root, lead.id);
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

- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: `/simplify`, then commit** — `git commit -m "feat(new-lead): lead artifact enrichment"`

---

### Task 2: `lib/map.mjs` — lead map + panels

**Files:**
- Create: `scripts/lib/map.mjs`
- Test: `scripts/test/map.test.mjs`

**Interfaces:**
- Produces: `buildLeadMap(root, id)` per the overview contract. Node ids are stable strings: `evidence-0…`, `interview`, `arch`, `component-<name>`, `estimate`, `scenario-<id>`, `proposal`.
- Layout: columns by type — evidence x=0, interview x=240, arch x=480, estimate x=720, proposal x=960; children (components/scenarios) same column as parent +40, y stacked at 90px steps.

- [ ] **Step 1: Write failing tests**

```js
// scripts/test/map.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLeadMap } from '../lib/map.mjs';

const ROOT = new URL('./fixtures/root', import.meta.url).pathname;
const byId = (m, id) => m.nodes.find(n => n.id === id);

test('nodes for every pipeline stage with disk-truth status', async () => {
  const m = await buildLeadMap(ROOT, 'acme-crm');
  assert.equal(byId(m, 'interview').data.status, 'ready');
  assert.equal(byId(m, 'arch').data.status, 'ready');
  assert.equal(byId(m, 'arch').data.href, '/acme-crm/dist/index.html');
  assert.equal(byId(m, 'estimate').data.status, 'ready');     // estimation.json exists
  assert.equal(byId(m, 'estimate').data.href, null);           // estimate.html absent
  assert.equal(byId(m, 'proposal').data.status, 'pending');
});
test('components parsed from ARCHITECTURE.md §6 table', async () => {
  const m = await buildLeadMap(ROOT, 'acme-crm');
  assert.ok(byId(m, 'component-atlas.api'));
  assert.ok(byId(m, 'component-atlas.web'));
  assert.ok(m.edges.some(e => e.source === 'arch' && e.target === 'component-atlas.api'));
});
test('scenario nodes from estimation.json', async () => {
  const m = await buildLeadMap(ROOT, 'acme-crm');
  assert.ok(byId(m, 'scenario-balanced'));
});
test('panels carry brief, risks, open questions', async () => {
  const m = await buildLeadMap(ROOT, 'acme-crm');
  assert.match(m.panels.brief, /Acme/);
  assert.deepEqual(m.panels.risks, ['Legacy data migration', 'SSO unknowns']);
  assert.deepEqual(m.panels.openQuestions, ['Reporting']);
});
test('sparse lead dir degrades to pending nodes, empty panels', async () => {
  const m = await buildLeadMap(ROOT, 'ghost');
  assert.equal(byId(m, 'arch').data.status, 'pending');
  assert.equal(m.panels.brief, null);
  assert.deepEqual(m.panels.risks, []);
});
```

- [ ] **Step 2: Run to verify failure.**

- [ ] **Step 3: Implement.** Structure (keep each function ≤ 20 lines; file will land ~180 lines):

```js
// scripts/lib/map.mjs
// new-lead-dashboard v1
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';

const X = { evidence: 0, interview: 240, arch: 480, estimate: 720, proposal: 960 };

export async function buildLeadMap(root, id) {
  const dir = join(root, id);
  const src = await readSources(dir);           // {answers, arch, estimation, inputs, brief}
  const nodes = [...evidenceNodes(src), interviewNode(src),
    ...docNodes(id, dir, src)];
  return { nodes, edges: edgesFor(nodes), panels: await panelsFor(root, id, src) };
}
```

Helper responsibilities (implement each):
- `readSources(dir)` — reads `new-lead-answers.json`, `ARCHITECTURE.md`, `estimation.json`, `estimation-inputs.json`, `brief.md`; each `null` when missing/unparseable (wrap in try/catch per file).
- `evidenceNodes(src)` — one node per `src.answers?.evidence?.sources ?? []`, id `evidence-<i>`, label from `type`, detail from `summary`.
- `interviewNode(src)` — status `ready` when answers exist, detail = `src.answers?.scope?.summary ?? null`.
- `docNodes(id, dir, src)` — `arch`/`estimate`/`proposal` nodes: status `ready` when their source doc exists (`ARCHITECTURE.md` / `estimation.json` / `proposal.md`); `href` `/<id>/dist/<page>` only when the rendered page exists (`existsSync`); plus `componentNodes(src.arch)` under arch and `scenarioNodes(src.estimation)` under estimate.
- `parseComponents(archMd)` — slice text between `/^##\s*6\./m` heading and the next `/^##\s/m`; rows = lines starting `|` minus the header and `|---` separator; component name = first cell, backticks stripped.
- `scenarioNodes(est)` — `(est?.scenarios ?? []).map(s => ({id: 'scenario-' + (s.id ?? s.name), ...}))`.
- `edgesFor(nodes)` — chain evidence→interview→arch→estimate→proposal (only between nodes present), plus arch→each component, estimate→each scenario. Edge id `e-<source>-<target>`.
- `panelsFor(root, id, src)` — `brief` = brief.md text or null; `facts` = `{client: src.answers?.client ?? {}, tech: src.answers?.tech ?? {}, delivery: src.answers?.delivery ?? {}}`; `risks` = `(src.estimation?.risks ?? []).slice(0,3).map(r => r.title ?? r.name ?? String(r))`; `openQuestions` = inputs scope items whose `label === 'proposed'` → their `item ?? name`; `activity` = `git -C <root> log --format=%as %s -- <id>` lines via `promisify(execFile)`, `[]` on any error.
- `layout(nodes)` — assign `position` per the column spec; called before return.

- [ ] **Step 4: Run all tests** — PASS. Check file ≤ 200 lines; if over, split `parseComponents`+`scenarioNodes` into `lib/map-parse.mjs` and add it to `SCRIPT_FILES` in `init-root.mjs` and the copy list in `00-overview.md`.

- [ ] **Step 5: `/simplify`, then commit** — `git commit -m "feat(new-lead): lead lineage map builder"`

---

### Task 3: `serve.mjs`

**Files:**
- Create: `scripts/serve.mjs`
- Test: `scripts/test/serve.test.mjs`

**Interfaces:**
- Consumes: `registry.mjs`, `enrich.mjs`, `map.mjs` via relative `./lib/` imports (works both in skill dir and copied root).
- Produces: HTTP API from the overview contract. `node serve.mjs [--root <dir>] [--port <n>]` — root defaults to `findLeadsRoot(cwd)`, port to 4600. Exports `startServer(root, port) -> Promise<server>` for tests (port 0 = ephemeral).

- [ ] **Step 1: Write failing tests**

```js
// scripts/test/serve.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startServer } from '../serve.mjs';

let server, base, root;
before(async () => {
  root = await mkdtemp(join(tmpdir(), 'srv-'));      // copy fixture so POSTs don't dirty it
  await cp(new URL('./fixtures/root', import.meta.url).pathname, root, { recursive: true });
  server = await startServer(root, 0);
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

test('GET /api/leads returns enriched registry', async () => {
  const body = await (await fetch(`${base}/api/leads`)).json();
  const acme = body.leads.find(l => l.id === 'acme-crm');
  assert.equal(acme.artifacts.docs, true);
  assert.equal(acme.artifacts.proposal, false);
});
test('GET /api/leads/:id/map returns nodes', async () => {
  const map = await (await fetch(`${base}/api/leads/acme-crm/map`)).json();
  assert.ok(map.nodes.some(n => n.id === 'arch'));
});
test('POST /api/leads/:id marks won and stamps closed', async () => {
  const res = await fetch(`${base}/api/leads/acme-crm`, {
    method: 'POST', body: JSON.stringify({ status: 'won' }),
    headers: { 'content-type': 'application/json' },
  });
  const lead = await res.json();
  assert.equal(lead.status, 'won');
  assert.match(lead.closed, /^\d{4}-\d{2}-\d{2}$/);
});
test('POST bad status -> 400; unknown id -> 404', async () => {
  const bad = await fetch(`${base}/api/leads/acme-crm`, { method: 'POST', body: '{"status":"maybe"}' });
  assert.equal(bad.status, 400);
  const missing = await fetch(`${base}/api/leads/nope`, { method: 'POST', body: '{"status":"won"}' });
  assert.equal(missing.status, 404);
});
test('POST notes writes notes.md', async () => {
  await fetch(`${base}/api/leads/acme-crm/notes`, { method: 'POST', body: '{"content":"call went well"}' });
  assert.match(await readFile(join(root, 'acme-crm', 'notes.md'), 'utf8'), /call went well/);
});
test('static serving with traversal guard', async () => {
  assert.equal((await fetch(`${base}/acme-crm/dist/index.html`)).status, 200);
  assert.equal((await fetch(`${base}/../../etc/passwd`)).status, 403);
  assert.equal((await fetch(`${base}/acme-crm/%2e%2e/leads.json.lock`)).status, 403);
});
```

- [ ] **Step 2: Run to verify failure.**

- [ ] **Step 3: Implement.** Shape:

```js
// scripts/serve.mjs
// new-lead-dashboard v1
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve, sep, extname } from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { findLeadsRoot, readRegistry, writeRegistry, STATUSES } from './lib/registry.mjs';
import { enrichLead } from './lib/enrich.mjs';
import { buildLeadMap } from './lib/map.mjs';

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.md': 'text/plain' };

export function startServer(root, port) {
  const server = createServer((req, res) => route(root, req, res)
    .catch(err => send(res, 500, { error: err.message })));
  return new Promise(ok => server.listen(port, '127.0.0.1', () => ok(server)));
}
```

Routing rules:
- Match in order: `GET /` → `index.html` from root; `GET /detail/:id` → `detail.html`; `GET /api/leads`; `GET /api/leads/:id/map`; `POST /api/leads/:id/notes`; `POST /api/leads/:id`; else static.
- `:id` pattern `([a-z0-9-]+)` — anything else falls through to static (which then 403/404s).
- `apiLeads`: `readRegistry` → `Promise.all(leads.map(l => enrichLead(root, l)))` → `{version, leads}`.
- `apiUpdate`: body JSON (reject non-JSON → 400); `status` must be in `STATUSES` → else 400; lead must exist → else 404; `closed = status === 'active' ? null : (body.closed ?? new Date().toISOString().slice(0, 10))`; `writeRegistry`; respond with the updated lead. A locked registry error → 409.
- `apiNotes`: body `{content}` (string, else 400) → `writeFile(join(root, id, 'notes.md'))`; lead dir must exist → 404.
- Static: `const p = resolve(root, '.' + decodeURIComponent(url.pathname));` — reject with 403 when `!p.startsWith(root + sep)` or any path segment starts with `.` or is `leads.json.lock`; 404 when missing; content-type from `MIME[extname]` fallback `application/octet-stream`.
- CLI block (same `process.argv[1]` check as init-root): `--root` default `findLeadsRoot(process.cwd())` (exit 2 with message when null), `--port` default 4600; on listen log `dashboard: http://127.0.0.1:<port>`.

Keep handlers small; if the file exceeds 200 lines move the static handler to `lib/static.mjs` and add it to the copy lists (init-root `SCRIPT_FILES` + overview).

- [ ] **Step 4: Run all tests** — `node --test .../scripts/test/` — PASS.
- [ ] **Step 5: `/simplify`, then commit** — `git commit -m "feat(new-lead): dashboard server with won-lost and notes persistence"`

---

**Milestone exit criteria:** all tests green; manual smoke: `node scripts/serve.mjs --root scripts/test/fixtures/root --port 4600` (run from a copy, not the fixture) serves `/api/leads` and the arch viewer page.
