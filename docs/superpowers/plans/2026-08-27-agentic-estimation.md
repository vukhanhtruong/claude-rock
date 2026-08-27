# Agentic Estimation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add measurement-based estimation to the `estimate` skill: when the interview's new delivery-mode question is answered AGENTIC, task durations come from measured historical baselines in `~/.agents-rock/measurements.jsonl` instead of PERT + AI multipliers.

**Architecture:** Two new dependency-free libs (`measurements.mjs` for the jsonl data contract, `baselines.mjs` for the retrieval ladder + lognormal math) feed an agentic branch through the existing pipeline: `schema.mjs` validates agentic inputs, `rollup.mjs` computes from baselines, `checks.mjs` enforces the PRD §18 honesty rules, and `render.mjs` routes to a new agentic HTML template. The agent judges decomposition/shapes/seeds only; scripts own every number.

**Tech Stack:** Node ≥ 20, ESM `.mjs`, `node:test` runner, zero npm dependencies in skill scripts.

**Spec:** `docs/superpowers/specs/2026-08-27-agentic-estimation-design.md` (read it first; also `docs/requirements/measurement-based-estimation.md` for background).

## Global Constraints

- Skill scripts are dependency-free (no npm packages) and run on Node ≥ 20.
- Quality gates enforced by `quality-gates.test.mjs` on every file in `scripts/` and `scripts/lib/`: keep functions ≤ 20 lines, ≤ 3 params, files ≤ 200 lines.
- Team-mode behavior must not change: the golden-number tests in `compute.test.mjs` must pass untouched.
- Run tests from the repo root: `npm test` runs everything; single file: `node --test plugins/solution-architect/skills/estimate/scripts/test/<file>.test.mjs`.
- Commit messages: Conventional Commits, no AI attribution trailers.
- All paths below are relative to `plugins/solution-architect/skills/estimate/` unless they start with `plugins/` or `docs/`.
- The agent (interview side) never writes durations, confidence, or evidence into inputs — if a task needs one of those as input, the design is being violated; stop and re-read the spec.

---

### Task 1: Measurements data contract (`lib/measurements.mjs`)

**Files:**
- Create: `scripts/lib/measurements.mjs`
- Create: `scripts/test/fixtures/measurements.jsonl`
- Test: `scripts/test/measurements.test.mjs`

**Interfaces:**
- Produces: `TASK_SHAPES: string[]` (13 shapes), `DEFAULT_MEASUREMENTS_PATH`, `expandHome(path) → string`, `resolveMeasurementsPath(inputs) → string`, `checkMeasurement(rec) → {errors: string[], warnings: string[]}`, `loadMeasurements(path) → {records: object[], warnings: string[]}`.

- [ ] **Step 1: Write the fixture** — `scripts/test/fixtures/measurements.jsonl` (20 lines; numbers are load-bearing for Task 2 assertions, copy exactly):

```jsonl
{"task_id":"m01","task_description":"Refactor A","task_shape":"cross_file_refactor","repository":"project-a","agent":"claude-code","model":"sonnet","affected_files":9,"actual_minutes":6,"created_at":"2026-08-01T10:00:00Z"}
{"task_id":"m02","task_description":"Refactor B","task_shape":"cross_file_refactor","repository":"project-a","agent":"claude-code","model":"sonnet","affected_files":8,"actual_minutes":8,"created_at":"2026-08-02T10:00:00Z"}
{"task_id":"m03","task_description":"Refactor C","task_shape":"cross_file_refactor","repository":"project-a","agent":"claude-code","model":"sonnet","affected_files":10,"actual_minutes":9,"created_at":"2026-08-03T10:00:00Z"}
{"task_id":"m04","task_description":"Refactor D","task_shape":"cross_file_refactor","repository":"project-a","agent":"claude-code","model":"sonnet","affected_files":7,"actual_minutes":11,"created_at":"2026-08-04T10:00:00Z"}
{"task_id":"m05","task_description":"Refactor E","task_shape":"cross_file_refactor","repository":"project-a","agent":"claude-code","model":"sonnet","affected_files":8,"actual_minutes":12,"created_at":"2026-08-05T10:00:00Z"}
{"task_id":"m06","task_description":"Refactor F","task_shape":"cross_file_refactor","repository":"project-a","agent":"claude-code","model":"sonnet","affected_files":12,"actual_minutes":19,"created_at":"2026-08-06T10:00:00Z"}
{"task_id":"m07","task_description":"Refactor G","task_shape":"cross_file_refactor","repository":"project-a","agent":"claude-code","model":"sonnet","affected_files":9,"actual_minutes":34,"created_at":"2026-08-07T10:00:00Z"}
{"task_id":"m08","task_description":"Tests A","task_shape":"test_creation","repository":"project-a","agent":"claude-code","model":"sonnet","affected_files":2,"actual_minutes":8,"created_at":"2026-08-08T10:00:00Z"}
{"task_id":"m09","task_description":"Tests B","task_shape":"test_creation","repository":"project-a","agent":"claude-code","model":"sonnet","affected_files":2,"actual_minutes":9,"created_at":"2026-08-08T11:00:00Z"}
{"task_id":"m10","task_description":"Tests C","task_shape":"test_creation","repository":"project-a","agent":"claude-code","model":"sonnet","affected_files":3,"actual_minutes":9,"created_at":"2026-08-08T12:00:00Z"}
{"task_id":"m11","task_description":"Tests D","task_shape":"test_creation","repository":"project-a","agent":"claude-code","model":"sonnet","affected_files":2,"actual_minutes":10,"created_at":"2026-08-08T13:00:00Z"}
{"task_id":"m12","task_description":"Tests E","task_shape":"test_creation","repository":"project-a","agent":"claude-code","model":"sonnet","affected_files":1,"actual_minutes":10,"created_at":"2026-08-08T14:00:00Z"}
{"task_id":"m13","task_description":"Tests F","task_shape":"test_creation","repository":"project-a","agent":"claude-code","model":"sonnet","affected_files":2,"actual_minutes":10,"created_at":"2026-08-08T15:00:00Z"}
{"task_id":"m14","task_description":"Tests G","task_shape":"test_creation","repository":"project-a","agent":"claude-code","model":"sonnet","affected_files":3,"actual_minutes":11,"created_at":"2026-08-08T16:00:00Z"}
{"task_id":"m15","task_description":"Tests H","task_shape":"test_creation","repository":"project-a","agent":"claude-code","model":"sonnet","affected_files":2,"actual_minutes":11,"created_at":"2026-08-08T17:00:00Z"}
{"task_id":"m16","task_description":"Tests I","task_shape":"test_creation","repository":"project-a","agent":"claude-code","model":"sonnet","affected_files":2,"actual_minutes":12,"created_at":"2026-08-08T18:00:00Z"}
{"task_id":"m17","task_description":"Tests J","task_shape":"test_creation","repository":"project-a","agent":"claude-code","model":"sonnet","affected_files":4,"actual_minutes":13,"created_at":"2026-08-08T19:00:00Z"}
{"task_id":"m18","task_description":"Plan payment work","task_shape":"planning","repository":"project-b","agent":"claude-code","model":"opus","affected_files":0,"actual_minutes":55,"created_at":"2026-08-10T10:00:00Z"}
{"task_id":"m19","task_description":"Plan search work","task_shape":"planning","repository":"project-b","agent":"claude-code","model":"opus","affected_files":0,"actual_minutes":40,"created_at":"2026-08-11T10:00:00Z"}
{"task_id":"m20","task_description":"Cursor config tweak","task_shape":"configuration","repository":"project-c","agent":"cursor","model":"gpt","affected_files":1,"actual_minutes":7,"created_at":"2026-08-12T10:00:00Z"}
```

- [ ] **Step 2: Write the failing tests** — `scripts/test/measurements.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { join } from 'node:path';
import {
  TASK_SHAPES, DEFAULT_MEASUREMENTS_PATH, expandHome, resolveMeasurementsPath,
  checkMeasurement, loadMeasurements,
} from '../lib/measurements.mjs';

const fixturePath = new URL('./fixtures/measurements.jsonl', import.meta.url).pathname;

test('taxonomy carries the 13 spec shapes', () => {
  assert.equal(TASK_SHAPES.length, 13);
  for (const s of ['cross_file_refactor', 'planning', 'investigation', 'bug_fix']) {
    assert.ok(TASK_SHAPES.includes(s), s);
  }
});

test('expandHome resolves ~/ against the home directory', () => {
  assert.equal(expandHome('~/.agents-rock/m.jsonl'), join(homedir(), '.agents-rock/m.jsonl'));
  assert.equal(expandHome('/abs/path.jsonl'), '/abs/path.jsonl');
});

test('resolveMeasurementsPath prefers inputs override, else global default', () => {
  assert.equal(resolveMeasurementsPath({ measurementsPath: '/x.jsonl' }), '/x.jsonl');
  assert.equal(resolveMeasurementsPath({}), expandHome(DEFAULT_MEASUREMENTS_PATH));
});

test('checkMeasurement: valid record passes, bad fields are errors, unknown shape is a warning', () => {
  const good = { task_shape: 'bug_fix', repository: 'r', agent: 'a', model: 'm', actual_minutes: 5 };
  assert.deepEqual(checkMeasurement(good), { errors: [], warnings: [] });
  const bad = checkMeasurement({ task_shape: 'bug_fix', repository: '', agent: 'a', model: 'm', actual_minutes: 0 });
  assert.equal(bad.errors.length, 2); // repository empty, actual_minutes not positive
  const odd = checkMeasurement({ ...good, task_shape: 'quantum_reticulation' });
  assert.deepEqual(odd.errors, []);
  assert.equal(odd.warnings.length, 1);
});

test('loadMeasurements: missing file is empty, corrupt/invalid lines are skipped with warnings', () => {
  assert.deepEqual(loadMeasurements('/nonexistent/nowhere.jsonl'), { records: [], warnings: [] });
  const dir = mkdtempSync(join(tmpdir(), 'meas-'));
  const p = join(dir, 'm.jsonl');
  writeFileSync(p, `${JSON.stringify({ task_shape: 'bug_fix', repository: 'r', agent: 'a', model: 'm', actual_minutes: 5 })}\nnot json\n${JSON.stringify({ task_shape: 'bug_fix', repository: 'r', agent: 'a', model: 'm', actual_minutes: -1 })}\n`);
  const { records, warnings } = loadMeasurements(p);
  assert.equal(records.length, 1);
  assert.equal(warnings.length, 2);
});

test('the shipped fixture is fully valid', () => {
  const { records, warnings } = loadMeasurements(fixturePath);
  assert.equal(records.length, 20);
  assert.deepEqual(warnings, []);
});
```

- [ ] **Step 3: Run tests, verify they fail** — `node --test plugins/solution-architect/skills/estimate/scripts/test/measurements.test.mjs` → FAIL (module not found).

- [ ] **Step 4: Implement** — `scripts/lib/measurements.mjs`:

```js
// The measurements.jsonl data contract — the one module that knows what a
// measurement record looks like. The estimate skill reads through here; the
// future record-task skill will write through here. Append-only by design:
// nothing in this module mutates the file.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

export const TASK_SHAPES = [
  'scaffold', 'small_implementation', 'cross_file_refactor', 'test_creation',
  'bug_fix', 'configuration', 'api_integration', 'database_change',
  'documentation', 'ui_implementation', 'migration', 'investigation', 'planning',
];

export const DEFAULT_MEASUREMENTS_PATH = '~/.agents-rock/measurements.jsonl';

export function expandHome(path) {
  return path.startsWith('~/') ? join(homedir(), path.slice(2)) : path;
}

export function resolveMeasurementsPath(inputs) {
  return expandHome(inputs.measurementsPath ?? DEFAULT_MEASUREMENTS_PATH);
}

// Unknown shapes are warnings, not errors: the taxonomy is extensible and a
// record written under a future shape must not be silently discarded.
export function checkMeasurement(rec) {
  const errors = [];
  const warnings = [];
  for (const key of ['task_shape', 'repository', 'agent', 'model']) {
    if (!(typeof rec[key] === 'string' && rec[key].trim())) errors.push(`${key} must be a non-empty string`);
  }
  if (!(typeof rec.actual_minutes === 'number' && rec.actual_minutes > 0)) {
    errors.push('actual_minutes must be a positive number');
  }
  if (typeof rec.task_shape === 'string' && rec.task_shape.trim() && !TASK_SHAPES.includes(rec.task_shape)) {
    warnings.push(`unknown task_shape "${rec.task_shape}" (kept)`);
  }
  return { errors, warnings };
}

function parseLine(line, lineNo, out) {
  let rec;
  try { rec = JSON.parse(line); } catch { out.warnings.push(`line ${lineNo}: unparseable JSON, skipped`); return; }
  const { errors, warnings } = checkMeasurement(rec);
  if (errors.length) { out.warnings.push(`line ${lineNo}: ${errors.join('; ')} — skipped`); return; }
  out.warnings.push(...warnings.map((w) => `line ${lineNo}: ${w}`));
  out.records.push(rec);
}

// A missing file is the cold-start case, not an error: zero records means
// every estimate renders Uncalibrated, which is the designed behavior.
export function loadMeasurements(path) {
  let text;
  try { text = readFileSync(path, 'utf8'); } catch { return { records: [], warnings: [] }; }
  const out = { records: [], warnings: [] };
  text.split('\n').forEach((line, i) => { if (line.trim()) parseLine(line, i + 1, out); });
  return out;
}
```

- [ ] **Step 5: Run tests, verify they pass** — same command → all PASS.

- [ ] **Step 6: Commit**

```bash
git add plugins/solution-architect/skills/estimate/scripts/lib/measurements.mjs plugins/solution-architect/skills/estimate/scripts/test/measurements.test.mjs plugins/solution-architect/skills/estimate/scripts/test/fixtures/measurements.jsonl
git commit -m "feat(estimate): add measurements.jsonl data contract module"
```

---

### Task 2: Baseline retrieval ladder + statistics (`lib/baselines.mjs`, part 1)

**Files:**
- Create: `scripts/lib/baselines.mjs`
- Test: `scripts/test/baselines.test.mjs`

**Interfaces:**
- Consumes: `loadMeasurements` fixture records from Task 1.
- Produces: `percentile(values, q) → number` (linear interpolation), `matchBaseline(task, ctx) → {p50, p80, p95, samples, matchLevel, evidence[]}` where `ctx = {records, agentContext}` and `agentContext = {agent, model, repository}`; no-match returns `{samples: 0, matchLevel: 0, evidence: []}`. `evidence[]` entries: `{id, description, minutes}`. `confidenceFor(stats) → 'HIGH'|'MED'|'LOW'|'UNCALIBRATED'`.

- [ ] **Step 1: Write the failing tests** — `scripts/test/baselines.test.mjs` (Task 3 appends to this file):

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadMeasurements } from '../lib/measurements.mjs';
import { percentile, matchBaseline, confidenceFor } from '../lib/baselines.mjs';

const fixturePath = new URL('./fixtures/measurements.jsonl', import.meta.url).pathname;
const records = () => loadMeasurements(fixturePath).records;
const CTX = { agent: 'claude-code', model: 'sonnet', repository: 'project-a' };
const near = (a, b) => assert.ok(Math.abs(a - b) < 0.01, `${a} !~ ${b}`);

test('percentile interpolates linearly', () => {
  const v = [6, 8, 9, 11, 12, 19, 34];
  near(percentile(v, 0.5), 11);
  near(percentile(v, 0.8), 17.6);   // pos 4.8 → 12 + 0.8·(19−12)
  near(percentile(v, 0.95), 29.5);  // pos 5.7 → 19 + 0.7·(34−19)
});

test('rung 1: exact repo+agent+model match wins', () => {
  const stats = matchBaseline(
    { shape: 'cross_file_refactor', scope: { affectedFiles: 8 } },
    { records: records(), agentContext: CTX },
  );
  assert.equal(stats.matchLevel, 1);
  assert.equal(stats.samples, 7);
  near(stats.p50, 11);
  assert.equal(stats.evidence.length, 7);
  assert.deepEqual(stats.evidence[0], { id: 'm01', description: 'Refactor A', minutes: 6 });
});

test('rung 2: different repo falls through to shape+agent', () => {
  const stats = matchBaseline(
    { shape: 'cross_file_refactor', scope: { affectedFiles: 8 } },
    { records: records(), agentContext: { ...CTX, repository: 'other-repo' } },
  );
  assert.equal(stats.matchLevel, 2);
  assert.equal(stats.samples, 7);
});

test('per-task model override matches its own history', () => {
  const stats = matchBaseline(
    { shape: 'planning', scope: {}, model: 'opus' },
    { records: records(), agentContext: { agent: 'claude-code', model: 'sonnet', repository: 'project-b' } },
  );
  assert.equal(stats.samples, 2);   // rung 4: only 2 planning records exist
  assert.equal(stats.matchLevel, 4);
});

test('rung 3: similar scope (±50% affected files) when agent differs', () => {
  const stats = matchBaseline(
    { shape: 'configuration', scope: { affectedFiles: 1 } },
    { records: [...records(), ...records(), ...records()].filter((r) => r.task_shape === 'configuration'),
      agentContext: { agent: 'claude-code', model: 'sonnet', repository: 'project-a' } },
  );
  // 3 copies of the cursor config record: rung 2 fails (agent cursor), rung 3 matches on scope
  assert.equal(stats.matchLevel, 3);
  assert.equal(stats.samples, 3);
});

test('no match at any rung is UNCALIBRATED', () => {
  const stats = matchBaseline(
    { shape: 'database_change', scope: { affectedFiles: 2 } },
    { records: records(), agentContext: CTX },
  );
  assert.deepEqual(stats, { samples: 0, matchLevel: 0, evidence: [] });
  assert.equal(confidenceFor(stats), 'UNCALIBRATED');
});

test('confidence tiers follow the spec table', () => {
  assert.equal(confidenceFor({ samples: 0 }), 'UNCALIBRATED');
  assert.equal(confidenceFor({ samples: 2, p50: 10, p80: 11 }), 'LOW');
  assert.equal(confidenceFor({ samples: 7, p50: 11, p80: 17.6 }), 'MED');
  assert.equal(confidenceFor({ samples: 10, p50: 10, p80: 11.2 }), 'HIGH');
  assert.equal(confidenceFor({ samples: 10, p50: 10, p80: 25 }), 'MED'); // high variance demotes
});
```

- [ ] **Step 2: Run tests, verify they fail** — `node --test .../baselines.test.mjs` → FAIL (module not found).

- [ ] **Step 3: Implement** — `scripts/lib/baselines.mjs` (Task 3 extends this file):

```js
// Baseline retrieval and statistics for agentic estimation. Pure functions:
// records in, numbers out. The agent never touches this math — compute.mjs
// calls it, and the deliverable's Evidence section is built from what this
// module actually matched, so cited history can never be invented.
import { pert } from './estimate-math.mjs';

const Z95 = 1.645; // standard normal 95th-percentile z, applied in log space

export function percentile(values, q) {
  const s = [...values].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}

const effectiveModel = (task, ctx) => task.model ?? ctx.model;

function similarScope(rec, task) {
  const mine = task.scope?.affectedFiles;
  if (typeof mine !== 'number' || typeof rec.affected_files !== 'number' || mine <= 0) return false;
  return Math.abs(rec.affected_files - mine) / mine <= 0.5;
}

// Spec §2 ladder: stop at the first rung with enough samples. Rungs 1-3 need
// >= 3; the global rung accepts any evidence over none.
const RUNGS = [
  { level: 1, min: 3, hit: (r, t, c) => r.repository === c.repository && r.agent === c.agent && r.model === effectiveModel(t, c) },
  { level: 2, min: 3, hit: (r, t, c) => r.agent === c.agent },
  { level: 3, min: 3, hit: (r, t) => similarScope(r, t) },
  { level: 4, min: 1, hit: () => true },
];

function summarize(hits, level) {
  const mins = hits.map((r) => r.actual_minutes);
  return {
    p50: percentile(mins, 0.5),
    p80: percentile(mins, 0.8),
    p95: percentile(mins, 0.95),
    minM: percentile(mins, 0),
    maxM: percentile(mins, 1),
    samples: hits.length,
    matchLevel: level,
    evidence: hits.map((r) => ({ id: r.task_id, description: r.task_description, minutes: r.actual_minutes })),
  };
}

export function matchBaseline(task, ctx) {
  const shaped = ctx.records.filter((r) => r.task_shape === task.shape);
  for (const rung of RUNGS) {
    const hits = shaped.filter((r) => rung.hit(r, task, ctx.agentContext));
    if (hits.length >= rung.min) return summarize(hits, rung.level);
  }
  return { samples: 0, matchLevel: 0, evidence: [] };
}

// Spec confidence table: sample count sets the tier, variance can demote
// a would-be HIGH (p80/p50 >= 2 means the history itself is unpredictable).
export function confidenceFor(stats) {
  if (stats.samples === 0) return 'UNCALIBRATED';
  if (stats.samples < 3) return 'LOW';
  if (stats.samples < 10) return 'MED';
  return stats.p80 / stats.p50 < 2 ? 'HIGH' : 'MED';
}
```

- [ ] **Step 4: Run tests, verify they pass** — all PASS.

- [ ] **Step 5: Commit**

```bash
git add plugins/solution-architect/skills/estimate/scripts/lib/baselines.mjs plugins/solution-architect/skills/estimate/scripts/test/baselines.test.mjs
git commit -m "feat(estimate): baseline retrieval ladder with percentile stats"
```

---

### Task 3: Duration math (`lib/baselines.mjs`, part 2)

**Files:**
- Modify: `scripts/lib/baselines.mjs` (append)
- Modify: `scripts/test/baselines.test.mjs` (append)

**Interfaces:**
- Produces: `agenticTask(task, ctx) → {e, sigma, lowH, highH, minutes, samples, matchLevel, confidence, evidence, calibrated}` — `e`/`sigma`/`lowH`/`highH` in **hours**, `minutes` = matched p50 in minutes (or `null` uncalibrated). `task` needs `{shape, scope, seedMinutes: {o, m, p}, model?}`.

- [ ] **Step 1: Append failing tests** to `scripts/test/baselines.test.mjs`:

```js
// Task 3 appends: duration math.
import { agenticTask } from '../lib/baselines.mjs';

test('n>=5: lognormal fit — mean above median, spread from log-space z', () => {
  const a = agenticTask(
    { shape: 'cross_file_refactor', scope: { affectedFiles: 8 }, seedMinutes: { o: 10, m: 20, p: 45 } },
    { records: records(), agentContext: CTX },
  );
  // p50=11, p95=29.5 → σ_log=ln(29.5/11)/1.645≈0.5997
  // e = 11·exp(σ_log²/2) ≈ 13.17 min; σ = e·√(exp(σ_log²)−1) ≈ 8.66 min
  near(a.e, 13.17 / 60);
  near(a.sigma, 8.66 / 60);
  near(a.lowH, 11 / 60);
  near(a.highH, 29.5 / 60);
  assert.equal(a.calibrated, true);
  assert.equal(a.confidence, 'MED');
  near(a.minutes, 11);
});

test('1<=n<5: median of matches + seed-derived sigma', () => {
  const a = agenticTask(
    { shape: 'planning', scope: {}, model: 'opus', seedMinutes: { o: 20, m: 40, p: 80 } },
    { records: records(), agentContext: { agent: 'claude-code', model: 'sonnet', repository: 'project-b' } },
  );
  near(a.e, 47.5 / 60);          // median of [40, 55]
  near(a.sigma, (80 - 20) / 6 / 60);
  near(a.lowH, 40 / 60);         // small samples: bounds are min/max of matches
  near(a.highH, 55 / 60);
  assert.equal(a.confidence, 'LOW');
  assert.equal(a.calibrated, true);
});

test('n=0: seed pert, uncalibrated', () => {
  const a = agenticTask(
    { shape: 'database_change', scope: {}, seedMinutes: { o: 10, m: 20, p: 40 } },
    { records: records(), agentContext: CTX },
  );
  near(a.e, ((10 + 80 + 40) / 6) / 60);   // pert e = 21.67 min
  near(a.sigma, (30 / 6) / 60);
  near(a.lowH, 10 / 60);
  near(a.highH, 40 / 60);
  assert.equal(a.calibrated, false);
  assert.equal(a.confidence, 'UNCALIBRATED');
  assert.equal(a.minutes, null);
});
```

- [ ] **Step 2: Run tests, verify the three new ones fail** — FAIL (`agenticTask` not exported).

- [ ] **Step 3: Append implementation** to `scripts/lib/baselines.mjs`:

```js
function lognormalFit(stats) {
  const sigmaLog = Math.log(stats.p95 / stats.p50) / Z95;
  const mean = stats.p50 * Math.exp((sigmaLog ** 2) / 2);
  return { e: mean / 60, sigma: (mean * Math.sqrt(Math.exp(sigmaLog ** 2) - 1)) / 60 };
}

// Spec §3 bands: >=5 samples fit a lognormal (means sum; medians do not);
// 1-4 samples trust the matched median but take spread from the seed; zero
// samples fall back to the seed entirely.
function fitHours(stats, seed) {
  if (stats.samples >= 5) return lognormalFit(stats);
  if (stats.samples >= 1) return { e: stats.p50 / 60, sigma: (seed.p - seed.o) / 6 / 60 };
  const { e, sigma } = pert(seed);
  return { e: e / 60, sigma: sigma / 60 };
}

// Bounds per band: a lognormal fit reports p50..p95; with 1-4 samples the
// only honest bounds are the extremes actually observed (and p50 == e there,
// which would violate the low < hours < high deliverable rule); no samples
// falls back to the seed range.
function bounds(stats, seed) {
  if (stats.samples >= 5) return { lowH: stats.p50 / 60, highH: stats.p95 / 60 };
  if (stats.samples >= 1) return { lowH: stats.minM / 60, highH: stats.maxM / 60 };
  return { lowH: seed.o / 60, highH: seed.p / 60 };
}

export function agenticTask(task, ctx) {
  const stats = matchBaseline(task, ctx);
  const calibrated = stats.samples > 0;
  const { e, sigma } = fitHours(stats, task.seedMinutes);
  return {
    e,
    sigma,
    ...bounds(stats, task.seedMinutes),
    minutes: calibrated ? stats.p50 : null,
    samples: stats.samples,
    matchLevel: stats.matchLevel,
    confidence: confidenceFor(stats),
    evidence: stats.evidence,
    calibrated,
  };
}
```

- [ ] **Step 4: Run tests, verify all pass.** Also run `node --test .../quality-gates.test.mjs` — `baselines.mjs` must stay within gates.

- [ ] **Step 5: Commit**

```bash
git add plugins/solution-architect/skills/estimate/scripts/lib/baselines.mjs plugins/solution-architect/skills/estimate/scripts/test/baselines.test.mjs
git commit -m "feat(estimate): lognormal duration math for agentic tasks"
```

---

### Task 4: Schema — agentic input validation (`lib/schema.mjs`)

**Files:**
- Modify: `scripts/lib/schema.mjs`
- Modify: `scripts/test/schema.test.mjs` (append)
- Create: `scripts/test/fixtures/agentic-inputs.json`

**Interfaces:**
- Consumes: `TASK_SHAPES` from Task 1.
- Produces: `checkInputs(inputs)` accepts agentic inputs; the agentic fixture used by Tasks 5–7.

- [ ] **Step 1: Write the fixture** — `scripts/test/fixtures/agentic-inputs.json` (measurementsPath is a placeholder; tests rewrite it to an absolute path):

```json
{
  "project": "Booking revamp",
  "deliveryMode": "agentic",
  "technique": "measurement-based",
  "depth": "STANDARD",
  "agentContext": { "agent": "claude-code", "model": "sonnet", "repository": "project-a" },
  "measurementsPath": "FIXTURE_MEASUREMENTS",
  "overheadPct": 0.1,
  "assumptions": ["Existing CI pipeline stays as is"],
  "risks": [
    { "name": "SDK incompatibility", "probability": 0.3, "impactMinutes": 30, "reason": "new SDK may break integration test mocks" }
  ],
  "features": [
    {
      "id": "plan", "name": "Planning", "provenance": "proposed",
      "tasks": [
        { "id": "plan-refactor", "shape": "planning", "model": "opus",
          "scope": {}, "seedMinutes": { "o": 20, "m": 40, "p": 80 },
          "assumptions": [], "provenance": "proposed" }
      ]
    },
    {
      "id": "client-swap", "name": "API client swap", "provenance": "stated",
      "tasks": [
        { "id": "swap-refactor", "shape": "cross_file_refactor",
          "scope": { "affectedFiles": 8, "complexity": "low" },
          "seedMinutes": { "o": 10, "m": 20, "p": 45 },
          "assumptions": ["old client has no dynamic call sites"], "provenance": "stated" },
        { "id": "swap-tests", "shape": "test_creation",
          "scope": { "affectedFiles": 2, "complexity": "low" },
          "seedMinutes": { "o": 5, "m": 10, "p": 20 },
          "assumptions": [], "provenance": "proposed" },
        { "id": "swap-db", "shape": "database_change",
          "scope": { "affectedFiles": 2, "complexity": "med" },
          "seedMinutes": { "o": 15, "m": 30, "p": 60 },
          "assumptions": [], "provenance": "proposed" }
      ]
    }
  ],
  "scenarios": [
    { "id": "solo", "plan": "max5x", "team": [{ "seniority": "senior", "rate": 90 }] },
    { "id": "pair", "plan": "max20x", "team": [{ "seniority": "senior", "rate": 90 }, { "seniority": "mid", "rate": 60 }] }
  ],
  "recommendedScenario": "solo"
}
```

- [ ] **Step 2: Append failing tests** to `scripts/test/schema.test.mjs`:

```js
// Agentic-mode schema branch.
import { readFileSync } from 'node:fs';

const agenticFixturePath = new URL('./fixtures/agentic-inputs.json', import.meta.url).pathname;
const agenticFixture = () => JSON.parse(readFileSync(agenticFixturePath, 'utf8'));

test('agentic fixture validates clean', () => {
  assert.deepEqual(checkInputs(agenticFixture()), []);
});

test('agentic tasks reject team-mode and script-owned fields', () => {
  const inputs = agenticFixture();
  Object.assign(inputs.features[1].tasks[0], { category: 'boilerplate', confidence: 'HIGH', o: 1, m: 2, p: 3 });
  const findings = checkInputs(inputs);
  for (const banned of ['category', 'confidence', '"o"', '"m"', '"p"']) {
    assert.ok(findings.some((f) => f.includes(banned)), `expected finding for ${banned}: ${findings}`);
  }
});

test('agentic tasks require shape, scope, ordered positive seedMinutes', () => {
  const inputs = agenticFixture();
  const task = inputs.features[1].tasks[0];
  task.shape = 'jazz_hands';
  task.seedMinutes = { o: 45, m: 20, p: 10 };
  delete task.scope;
  const findings = checkInputs(inputs);
  assert.ok(findings.some((f) => f.includes('unknown shape')));
  assert.ok(findings.some((f) => f.includes('seedMinutes')));
  assert.ok(findings.some((f) => f.includes('scope')));
});

test('agentic mode requires agentContext and minute-based risks with reasons', () => {
  const inputs = agenticFixture();
  delete inputs.agentContext;
  inputs.risks = [{ name: 'r', probability: 0.5, impactHours: 2 }];
  const findings = checkInputs(inputs);
  assert.ok(findings.some((f) => f.includes('agentContext')));
  assert.ok(findings.some((f) => f.includes('impactMinutes')));
  assert.ok(findings.some((f) => f.includes('reason')));
});

test('deliveryMode vocabulary is enforced; team inputs stay valid', () => {
  const inputs = agenticFixture();
  inputs.deliveryMode = 'vibes';
  assert.ok(checkInputs(inputs).some((f) => f.includes('deliveryMode')));
  assert.deepEqual(checkInputs(fixture()), []); // existing booking fixture untouched
});
```

(`fixture()` and `checkInputs` are already imported at the top of the existing test file.)

- [ ] **Step 3: Run tests, verify new ones fail.**

- [ ] **Step 4: Implement in `scripts/lib/schema.mjs`.** Add imports and branch. Concretely:

```js
import { TASK_SHAPES } from './measurements.mjs';

const DELIVERY_MODES = ['traditional', 'agentic'];
const isAgentic = (inputs) => inputs.deliveryMode === 'agentic';

// Durations and confidence are script-owned in agentic mode: their absence
// from inputs is the structural guarantee the agent never invents them.
const AGENTIC_BANNED = ['category', 'confidence', 'o', 'm', 'p'];

function checkAgenticTask(task, out) {
  if (!TASK_SHAPES.includes(task.shape)) out.push(`task ${task.id}: unknown shape "${task.shape}"`);
  const s = task.seedMinutes ?? {};
  if (!['o', 'm', 'p'].every((k) => typeof s[k] === 'number' && s[k] > 0)) {
    out.push(`task ${task.id}: seedMinutes o, m, p must be positive numbers`);
  } else if (!(s.o <= s.m && s.m <= s.p)) out.push(`task ${task.id}: seedMinutes expected o <= m <= p`);
  if (typeof task.scope !== 'object' || task.scope === null) out.push(`task ${task.id}: scope object is required`);
  for (const key of AGENTIC_BANNED) {
    if (Object.hasOwn(task, key)) out.push(`task ${task.id}: "${key}" is not an agentic input — the script computes it`);
  }
  if (task.model !== undefined && !(typeof task.model === 'string' && task.model.trim())) {
    out.push(`task ${task.id}: model must be a non-empty string`);
  }
  if (!Array.isArray(task.assumptions)) out.push(`task ${task.id}: assumptions array is required`);
  if (!PROVENANCE.includes(task.provenance)) out.push(`task ${task.id}: provenance not in vocabulary`);
}

function checkAgentContext(inputs, out) {
  const ctx = inputs.agentContext;
  if (typeof ctx !== 'object' || ctx === null) { out.push('agentic mode requires top-level agentContext'); return; }
  for (const key of ['agent', 'model']) {
    if (!(typeof ctx[key] === 'string' && ctx[key].trim())) out.push(`agentContext.${key} must be a non-empty string`);
  }
}
```

Then wire the branch:
- `checkFeature(feature, out)` → `checkFeature(feature, out, agentic)`; the task loop calls `checkAgenticTask` when `agentic`, `checkTask` otherwise. Caller in `checkInputs` passes `isAgentic(inputs)`.
- In `checkGlobals`: when agentic, `verificationPct` may be absent (skip that check); risk loop checks `impactMinutes > 0` and non-empty `reason` instead of `impactHours` (keep probability check shared). Split the risk check into `checkRisk(r, out, agentic)` to stay within function-length gates.
- In `checkInputs`: `if (inputs.deliveryMode !== undefined && !DELIVERY_MODES.includes(inputs.deliveryMode)) out.push('deliveryMode must be traditional|agentic');` and `if (isAgentic(inputs)) checkAgentContext(inputs, out);`. When agentic, drop the missing-`verificationPct` complaint but keep requiring the other top-level keys.

- [ ] **Step 5: Run schema tests + full estimate suite** — new tests pass, existing schema/compute tests untouched.

- [ ] **Step 6: Commit**

```bash
git add plugins/solution-architect/skills/estimate/scripts/lib/schema.mjs plugins/solution-architect/skills/estimate/scripts/test/schema.test.mjs plugins/solution-architect/skills/estimate/scripts/test/fixtures/agentic-inputs.json
git commit -m "feat(estimate): validate agentic estimation inputs"
```

---

### Task 5: Rollup + compute — agentic branch

**Files:**
- Modify: `scripts/lib/rollup.mjs`
- Modify: `scripts/compute.mjs`
- Modify: `scripts/test/compute.test.mjs` (append)

**Interfaces:**
- Consumes: `agenticTask` (Task 3), `loadMeasurements`/`resolveMeasurementsPath` (Task 1), agentic fixture (Task 4).
- Produces: `computeEstimation(inputs, measurements)` — second param is the records array, `undefined`/ignored in team mode. Agentic `computed.tasks[id]` = `{e, sigma, minutes, samples, matchLevel, confidence, calibrated, evidence}`. `CONFIDENCE_RANK` gains `UNCALIBRATED: 3`. `computed.scenarios[*].taskHours` identical across scenarios in agentic mode.

- [ ] **Step 1: Append failing tests** to `scripts/test/compute.test.mjs`:

```js
// Agentic-mode rollup.
import { loadMeasurements } from '../lib/measurements.mjs';

const agenticInputsPath = new URL('./fixtures/agentic-inputs.json', import.meta.url).pathname;
const measurementsFixture = new URL('./fixtures/measurements.jsonl', import.meta.url).pathname;
function agenticInputs() {
  const inputs = JSON.parse(readFileSync(agenticInputsPath, 'utf8'));
  inputs.measurementsPath = measurementsFixture;
  return inputs;
}
const measurements = () => loadMeasurements(measurementsFixture).records;

test('agentic tasks are baseline-driven and scenario-independent', () => {
  const { computed } = computeEstimation(agenticInputs(), measurements());
  const swap = computed.tasks['swap-refactor'];
  assert.equal(swap.samples, 7);
  assert.equal(swap.matchLevel, 1);
  assert.equal(swap.confidence, 'MED');
  assert.equal(swap.calibrated, true);
  assert.equal(swap.minutes, 11);
  assert.ok(Math.abs(swap.e - 13.17 / 60) < 0.01);
  const db = computed.tasks['swap-db'];
  assert.equal(db.confidence, 'UNCALIBRATED');
  assert.equal(db.calibrated, false);
  // measured durations do not vary by team or plan
  assert.deepEqual(computed.scenarios.solo.taskHours, computed.scenarios.pair.taskHours);
});

test('agentic risks convert minutes to hours; uncalibrated task taints project confidence', () => {
  const { computed } = computeEstimation(agenticInputs(), measurements());
  assert.equal(computed.riskBufferHours, Math.round((0.3 * 30 / 60) * 100) / 100);
  assert.equal(computed.projectConfidence, 'UNCALIBRATED'); // swap-db sits on the largest feature
});

test('compute.mjs CLI resolves measurementsPath itself', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-'));
  const inPath = join(dir, 'inputs.json');
  const outPath = join(dir, 'estimation.json');
  writeFileSync(inPath, JSON.stringify(agenticInputs()));
  execFileSync('node', [cli, '--inputs', inPath, '--out', outPath]);
  const estimation = JSON.parse(readFileSync(outPath, 'utf8'));
  assert.equal(estimation.computed.tasks['swap-refactor'].samples, 7);
});
```

- [ ] **Step 2: Run tests, verify new ones fail.**

- [ ] **Step 3: Implement.** In `scripts/lib/rollup.mjs`:

```js
import { agenticTask } from './baselines.mjs';
```

1. `computeEstimation(inputs)` → `computeEstimation(inputs, measurements)`. First line normalizes risks: `const risks = isAgentic(inputs) ? inputs.risks.map((r) => ({ ...r, impactHours: r.impactMinutes / 60 })) : inputs.risks;` (add a local `const isAgentic = (inputs) => inputs.deliveryMode === 'agentic';`). Pass `risks` to `globalBuffers`.
2. `buildTasks(inputs)` branches:

```js
function buildAgenticTasks(inputs, measurements) {
  const agentContext = { ...inputs.agentContext, repository: inputs.agentContext.repository ?? inputs.project };
  const ctx = { records: measurements ?? [], agentContext };
  const tasks = {};
  for (const feature of inputs.features) {
    for (const task of feature.tasks) {
      const a = agenticTask(task, ctx);
      tasks[task.id] = { ...a, o: a.lowH, p: a.highH };
    }
  }
  return tasks;
}
```

`buildTasks` keeps its current body for team mode; `computeEstimation` picks: `const tasks = isAgentic(inputs) ? buildAgenticTasks(inputs, measurements) : buildTasks(inputs);`
3. `buildFeatures`: change the `low`/`high` sums to read from the tasks map instead of the raw input tasks (identical result in team mode, correct in agentic): `const low = taskIds.reduce((sum, id) => sum + tasks[id].o, 0);` and same for `high` with `.p`.
4. `taskHoursFor(scenario, tasks)`: agentic tasks carry `calibrated`-mode markers; branch per task: `const entries = Object.keys(tasks).map((id) => [id, tasks[id].evidence !== undefined ? tasks[id].e : taskHours({ e: tasks[id].e, seniority, plan: scenario.plan, category: tasks[id].category, verificationPct: tasks[id].verificationPct })]);` — an agentic task is recognized by its `evidence` field (only `buildAgenticTasks` sets it). Compute `seniority` once, as today.
5. `CONFIDENCE_RANK` gains `UNCALIBRATED: 3` (worst).
6. The `computed.tasks` serialization at the bottom of `computeEstimation` includes the agentic fields when present:

```js
tasks: sortedMap(Object.entries(tasks).map(([id, t]) => [id, t.evidence !== undefined
  ? { e: round2(t.e), sigma: round2(t.sigma), minutes: t.minutes, samples: t.samples,
      matchLevel: t.matchLevel, confidence: t.confidence, calibrated: t.calibrated, evidence: t.evidence }
  : { e: round2(t.e), sigma: round2(t.sigma) }])),
```

In `scripts/compute.mjs`, after `checkInputs`:

```js
import { loadMeasurements, resolveMeasurementsPath } from './lib/measurements.mjs';
// ...
const measurements = inputs.deliveryMode === 'agentic'
  ? loadMeasurements(resolveMeasurementsPath(inputs)).records
  : undefined;
writeFileSync(args.out, `${JSON.stringify(computeEstimation(inputs, measurements), null, 2)}\n`);
```

- [ ] **Step 4: Run the full estimate suite** — new tests pass AND the golden-number team tests still pass byte-identical. Quality gates green (split helpers if a function exceeds 20 lines).

- [ ] **Step 5: Commit**

```bash
git add plugins/solution-architect/skills/estimate/scripts/lib/rollup.mjs plugins/solution-architect/skills/estimate/scripts/compute.mjs plugins/solution-architect/skills/estimate/scripts/test/compute.test.mjs
git commit -m "feat(estimate): compute agentic estimates from measured baselines"
```

---

### Task 6: Deliverable checks — PRD §18 enforcement (`lib/checks.mjs`)

**Files:**
- Modify: `scripts/lib/checks.mjs`
- Modify: `scripts/test/validate.test.mjs` (append)
- Create: `scripts/test/fixtures/agentic-estimation-pass.md`
- Create: `scripts/test/fixtures/agentic-estimation-fail.md`

**Interfaces:**
- Consumes: `computeEstimation(inputs, measurements)` (Task 5), `loadMeasurements`/`resolveMeasurementsPath` (Task 1).
- Produces: `checkDeliverables({md, estimation})` handles agentic estimations (loads measurements itself for the recompute).

- [ ] **Step 1: Write the pass fixture** — `scripts/test/fixtures/agentic-estimation-pass.md`. Build it to satisfy every existing structural rule plus the agentic ones. Skeleton (fill the numbers from an actual Task 5 compute run of the agentic fixture so rule 7's recompute matches):

```markdown
## Summary

Delivery: agentic (claude-code + sonnet) · Baselines: 20 measurements, 3 shapes matched

| Feature | Tier | src |
| --- | --- | --- |
| Planning | S | proposed |
| API client swap | S | stated |

Buffer: spread + risk buffer included below.

### Out of scope

- Anything not listed above.

## Estimation detail

Calibration: 20 measurement records; 1 of 4 tasks uncalibrated.

| Task | Baseline (min) | Samples | Match | Confidence | Assumptions | src |
| --- | --- | --- | --- | --- | --- | --- |
| plan-refactor | 47.5 | 2 | global shape | LOW | none | proposed |
| swap-refactor | 11 | 7 | repo+agent+model | MED | old client has no dynamic call sites | stated |
| swap-tests | 10 | 10 | repo+agent+model | HIGH | none | proposed |
| swap-db | not estimated | 0 | none | UNCALIBRATED | none | proposed |

| Scenario | Months | Total cost |
| --- | --- | --- |
| solo | 0.02 | 150 |
| pair | 0.01 | 160 |

### Evidence

| Id | Task | Actual (min) |
| --- | --- | --- |
| m01 | Refactor A | 6 |
| m02 | Refactor B | 8 |

### Assumptions

| Assumption | Impact if wrong |
| --- | --- |
| Existing CI pipeline stays as is | validation task grows |

### Risks

| Risk | Probability | Impact (min) | Reason |
| --- | --- | --- | --- |
| SDK incompatibility | 30% | 30 | new SDK may break integration test mocks |
```

- [ ] **Step 2: Write the fail fixture** — `agentic-estimation-fail.md`: copy the pass fixture, then (a) change the Summary line to `This will take 1–2 hours depending on complexity.`, (b) change swap-db's Confidence cell to `MED` while keeping Samples `0`, (c) add an Evidence row `| m99 | Invented run | 3 |`, (d) delete the `plan-refactor` row (no planning task rendered — but note the check reads inputs, so also used with a stripped-inputs estimation in the test), (e) remove the `Reason` column values.

- [ ] **Step 3: Append failing tests** to `scripts/test/validate.test.mjs`:

```js
// Agentic deliverable checks.
import { loadMeasurements } from '../lib/measurements.mjs';
import { computeEstimation } from '../lib/rollup.mjs';

const agenticMd = (f) => readFileSync(new URL(`./fixtures/${f}`, import.meta.url).pathname, 'utf8');
const measurementsFixture = new URL('./fixtures/measurements.jsonl', import.meta.url).pathname;

function agenticEstimation() {
  const inputs = JSON.parse(readFileSync(new URL('./fixtures/agentic-inputs.json', import.meta.url).pathname, 'utf8'));
  inputs.measurementsPath = measurementsFixture;
  return computeEstimation(inputs, loadMeasurements(measurementsFixture).records);
}

test('agentic pass fixture validates clean', () => {
  assert.deepEqual(checkDeliverables({ md: agenticMd('agentic-estimation-pass.md'), estimation: agenticEstimation() }), []);
});

test('agentic fail fixture trips every enforcement rule', () => {
  const findings = checkDeliverables({ md: agenticMd('agentic-estimation-fail.md'), estimation: agenticEstimation() });
  assert.ok(findings.some((f) => /vague estimate language/.test(f)), 'vague range');
  assert.ok(findings.some((f) => /uncalibrated/i.test(f)), 'uncalibrated masked as measured');
  assert.ok(findings.some((f) => /evidence/i.test(f) && /m99/.test(f)), 'invented evidence');
});

test('agentic estimation without a planning task is refused', () => {
  const estimation = agenticEstimation();
  estimation.inputs.features = estimation.inputs.features.filter((f) => f.id !== 'plan');
  const findings = checkDeliverables({ md: agenticMd('agentic-estimation-pass.md'), estimation });
  assert.ok(findings.some((f) => /planning/.test(f)));
});

test('missing Delivery header line is a finding', () => {
  const md = agenticMd('agentic-estimation-pass.md').replace(/Delivery: agentic.*\n/, '');
  const findings = checkDeliverables({ md, estimation: agenticEstimation() });
  assert.ok(findings.some((f) => /Delivery:/.test(f)));
});
```

- [ ] **Step 4: Run tests, verify new ones fail.**

- [ ] **Step 5: Implement in `scripts/lib/checks.mjs`.** Additions:

```js
import { loadMeasurements, resolveMeasurementsPath } from './measurements.mjs';

const VAGUE_PATTERNS = [
  /\b\d+\s*[–—-]\s*\d+\s*(hours?|hrs|minutes?|mins)\b/i,
  /\bhalf a day\b/i,
  /\ba few (hours|days|minutes)\b/i,
  /\bdepending on complexity\b/i,
];

function checkVagueness(md, out) {
  for (const re of VAGUE_PATTERNS) {
    const m = re.exec(md);
    if (m) out.push(`vague estimate language: "${m[0]}" — one number plus explicit risks`);
  }
}

// The md may only cite history the script actually matched: every Evidence id
// must exist in computed.tasks[*].evidence.
function checkEvidence(md, estimation, out) {
  const section = heading(md, 'Evidence');
  if (section === null) { out.push('missing ### Evidence section'); return; }
  const known = new Set(Object.values(estimation.computed.tasks).flatMap((t) => (t.evidence ?? []).map((e) => e.id)));
  for (const row of tables(section).flatMap((t) => t.rows)) {
    if (!known.has(row[0])) out.push(`evidence row "${row[0]}": not among script-matched measurements`);
  }
}

function checkAgenticRows(detail, estimation, out) {
  const table = tables(detail).find((t) => ['Task', 'Samples', 'Confidence'].every((h) => t.header.includes(h)));
  if (!table) { out.push('agentic task table not found (need Task, Samples, Confidence headers)'); return; }
  const confIdx = table.header.indexOf('Confidence');
  const samplesIdx = table.header.indexOf('Samples');
  for (const row of table.rows) {
    if (!['HIGH', 'MED', 'LOW', 'UNCALIBRATED'].includes(row[confIdx])) out.push(`task row "${row[0]}": bad confidence cell`);
    if (row[samplesIdx] === '0' && row[confIdx] !== 'UNCALIBRATED') {
      out.push(`task row "${row[0]}": zero samples must render UNCALIBRATED, never a measured confidence`);
    }
  }
}

function checkPlanningPresence(estimation, out) {
  const shapes = estimation.inputs.features.flatMap((f) => f.tasks).map((t) => t.shape);
  if (!shapes.includes('planning')) out.push('agentic decomposition needs >= 1 planning-shaped task (human-side work is work)');
}
```

Wire into `checkDeliverables`: when `estimation.inputs.deliveryMode === 'agentic'`, run `checkVagueness(md, out)`, `checkEvidence(md, estimation, out)`, `checkAgenticRows(heading(md, 'Estimation detail') ?? '', estimation, out)`, `checkPlanningPresence(estimation, out)`, and require `/Delivery:\s*agentic/.test(md)` (else push `'missing "Delivery: agentic" header line'`). **Route around** the team-mode `checkTaskRows` (its `HIGH|MED|LOW`-only rule conflicts) — split `checkRows(md)` into mode-aware dispatch. `checkNumbers` recompute becomes: `const measurements = estimation.inputs.deliveryMode === 'agentic' ? loadMeasurements(resolveMeasurementsPath(estimation.inputs)).records : undefined; const recomputed = computeEstimation(estimation.inputs, measurements).computed;`. Risk table check: agentic risks print minutes — the existing structural rules don't inspect risk units, no change needed there. If `checks.mjs` crosses the 200-line file gate, move the agentic checks into a new `scripts/lib/agentic-checks.mjs` exporting `agenticFindings({md, estimation}) → string[]` and call it from `checkDeliverables`.

- [ ] **Step 6: Regenerate the pass fixture numbers.** Run compute against the agentic fixture, paste real months/cost/e values into `agentic-estimation-pass.md` so rule-7 recompute and row rules pass. Re-run tests until the pass fixture is clean.

- [ ] **Step 7: Run full estimate suite + quality gates — green.**

- [ ] **Step 8: Commit**

```bash
git add plugins/solution-architect/skills/estimate/scripts/lib/checks.mjs plugins/solution-architect/skills/estimate/scripts/lib/agentic-checks.mjs plugins/solution-architect/skills/estimate/scripts/test/validate.test.mjs plugins/solution-architect/skills/estimate/scripts/test/fixtures/agentic-estimation-pass.md plugins/solution-architect/skills/estimate/scripts/test/fixtures/agentic-estimation-fail.md
git commit -m "feat(estimate): enforce measurement honesty rules on agentic deliverables"
```

(Drop `agentic-checks.mjs` from the add list if it wasn't needed.)

---

### Task 7: Agentic HTML template + render routing

**Files:**
- Create: `assets/estimate-template-agentic.html`
- Modify: `scripts/render.mjs`
- Modify: `scripts/test/render.test.mjs` (append)

**Interfaces:**
- Consumes: agentic `estimation.json` shape from Task 5 (`computed.tasks[*].{minutes, samples, matchLevel, confidence, evidence, calibrated}`), pass fixture md from Task 6.
- Produces: `render.mjs` routes by `estimation.inputs.deliveryMode`; agentic page renders evidence + confidence badges; `--client-only` still redacts.

- [ ] **Step 1: Append failing tests** to `scripts/test/render.test.mjs` (follow the file's existing helper style for building a tmp dir with inputs/md/json):

```js
// Agentic template routing.
test('agentic estimation renders the agentic template', () => {
  const html = renderAgentic();           // helper mirroring existing render helpers,
                                          // built from the agentic fixtures of Tasks 4-6
  assert.match(html, /Delivery: agentic/);
  assert.match(html, /UNCALIBRATED/);
  assert.match(html, /Refactor A/);       // evidence rendered from computed data
  assert.doesNotMatch(html, /boilerplate/); // no AI-category machinery on this page
});

test('agentic client render still redacts rates', () => {
  const html = renderAgentic({ clientOnly: true });
  assert.doesNotMatch(html, /"rate":/);
});
```

- [ ] **Step 2: Run, verify fail.**

- [ ] **Step 3: Create the template.** Copy `assets/estimate-template.html` to `assets/estimate-template-agentic.html`, then apply these edits:

1. **Delete** the AI-category what-if slider block and its wiring (search `AI speedup` / category slider ids), the seniority what-if control if present as an AI-coupled control (team-size and plan controls stay), and every `help()` string referencing PERT/AI categories.
2. **Replace the task-table renderer columns** with: Task · Baseline (min) · Samples · Match · Confidence · Assumptions · src. Match level renders as text: `1 → repo+agent+model`, `2 → agent`, `3 → similar scope`, `4 → global shape`, `0 → none`. Confidence renders as a badge; add CSS class `conf-uncalibrated` (amber) alongside the existing confidence colors.
3. **Add an Evidence section renderer** after the task table:

```js
function renderEvidence() {
  const el = document.getElementById('evidence');
  if (!el) return;
  const rows = Object.entries(DATA.computed.tasks)
    .flatMap(([id, t]) => (t.evidence ?? []).map((e) => `<tr><td>${e.id}</td><td>${e.description}</td><td class="num">${e.minutes}</td><td>${id}</td></tr>`))
    .join('');
  el.innerHTML = `<table><caption>Evidence — measured runs backing the baselines ${help(
    'Every baseline is the median of these actual past executions. No row here, no number above.')}</caption>
    <thead><tr><th>Id</th><th>Task</th><th class="num">Actual (min)</th><th>Backs</th></tr></thead>
    <tbody>${rows}</tbody></table>`;
}
```

with `<section id="evidence"></section>` added after the detail section in the body.
4. **Rewrite `renderMethod()`** — same fold structure, agentic content:

```js
function renderMethod() {
  const el = document.getElementById('method');
  if (!el) return;
  el.innerHTML = `<details class="method-fold" open><summary><h2>Method</h2>
    <span class="tech">measurement-based &middot; ${DATA.inputs.agentContext.agent} + ${DATA.inputs.agentContext.model}</span>
    <span class="chev" aria-hidden="true">&#9656;</span></summary>
    <ul>
      <li>Each task is classified by shape and matched against measured past executions,
        narrowing from same repo + agent + model down to a global shape baseline.</li>
      <li>With &ge;5 samples, duration comes from a lognormal fit of the measured
        percentiles: the estimate is the distribution mean (means sum across tasks;
        medians do not), the spread feeds a project-level &radic;&Sigma;&sigma;&sup2; buffer.</li>
      <li>Tasks without history use the interview's seed guess and are labeled
        UNCALIBRATED — never presented as measured.</li>
      <li>Risks are explicit: probability &times; impact minutes, each with a stated
        reason. No blanket contingency exists anywhere on this page.</li>
      <li>Confidence per task comes from sample count and variance; the project badge
        is the worst task confidence on the largest feature.</li>
    </ul>
    <p class="sources"><span>Lognormal task durations and median-vs-mean — Erik Bernhardsson,
      erikbern.com/2019/04/15/why-software-projects-take-longer-than-you-think-a-statistical-model.html.</span>
    <span>Percentile-based cycle-time forecasting — Daniel Vacanti, Actionable Agile Metrics for Predictability.</span>
    <span>Buffer machinery — Atomic Object, atomicobject.com/client-resources/better-custom-software-estimates.</span></p></details>`;
}
```

5. **Header**: add the `Delivery: agentic (…) · Baselines: N measurements` line sourced from `DATA` (count = distinct evidence ids).
6. Keep the what-if readout: recompute months/cost from team/plan controls via the inlined `scenarioRollup`/`effectiveCapacity` — task hours are constants from `DATA` in agentic mode.

- [ ] **Step 4: Route in `scripts/render.mjs`** — where `templatePath` is set, pick by mode:

```js
const templateFile = estimation.inputs.deliveryMode === 'agentic'
  ? 'estimate-template-agentic.html' : 'estimate-template.html';
```

(Adapt to however the existing constant is built — same directory.)

- [ ] **Step 5: Run render tests + `browser.test.mjs` + quality gates** (template scripts are gate-checked). Fix violations by extracting small functions inside the template script.

- [ ] **Step 6: Commit**

```bash
git add plugins/solution-architect/skills/estimate/assets/estimate-template-agentic.html plugins/solution-architect/skills/estimate/scripts/render.mjs plugins/solution-architect/skills/estimate/scripts/test/render.test.mjs
git commit -m "feat(estimate): agentic HTML template with evidence and confidence badges"
```

---

### Task 8: Reference docs + interview + SKILL.md

**Files:**
- Create: `references/task-shapes.md`
- Create: `references/agentic-estimation.md`
- Modify: `references/interview.md`
- Modify: `references/writing.md`
- Modify: `references/ai-multipliers.md`
- Modify: `SKILL.md`
- Modify: `scripts/test/references.test.mjs`

**Interfaces:**
- Consumes: everything above — the docs describe shipped behavior only.
- Produces: interview flow with the delivery-mode fork; doc contract tests.

- [ ] **Step 1: Extend `references.test.mjs` first (failing)** — add the new docs to `ALL` and add:

```js
import { TASK_SHAPES } from '../lib/measurements.mjs';

test('task-shapes.md names every shape in the code taxonomy', () => {
  const doc = ref('task-shapes.md');
  for (const shape of TASK_SHAPES) assert.ok(doc.includes(shape), `task-shapes.md missing: ${shape}`);
});

test('agentic-estimation.md states ladder, math bands, confidence, and sources', () => {
  const doc = ref('agentic-estimation.md');
  for (const needle of ['repo', 'lognormal', '1.645', 'UNCALIBRATED', 'planning',
    'means sum', 'impactMinutes', 'measurements.jsonl']) {
    assert.ok(doc.includes(needle), `agentic-estimation.md missing: ${needle}`);
  }
  assert.ok(/## Sources/.test(doc));
  for (const src of ['erikbern.com', 'Vacanti', 'atomicobject.com']) assert.ok(doc.includes(src), src);
});

test('interview.md carries the delivery-mode fork', () => {
  const doc = ref('interview.md');
  for (const needle of ['Delivery mode', 'TRADITIONAL', 'AGENTIC', 'agentContext', 'seed']) {
    assert.ok(doc.includes(needle), `interview.md missing: ${needle}`);
  }
});
```

Run → FAIL.

- [ ] **Step 2: Write `references/task-shapes.md`.** One section per shape (all 13 from `TASK_SHAPES`), each with: one-line definition, 2–3 example tasks, which scope attributes matter (`affectedFiles` for `cross_file_refactor`/`migration`; `complexity` everywhere; none beyond description for `planning`/`investigation`). Open with: shapes classify *operations, not features*; a feature usually decomposes into several shapes; classification guidance — pick by what the agent *does* (files touched, kind of change), not by business domain. Close with an Extensibility section: unknown shapes in measurement records are warnings (kept); inputs must use the taxonomy above; extending it means adding to `TASK_SHAPES` in `scripts/lib/measurements.mjs` and this doc in the same commit.

- [ ] **Step 3: Write `references/agentic-estimation.md`.** Sections:
  1. **When** — deliveryMode AGENTIC; measurement-based replaces the technique menu.
  2. **Dataset** — `~/.agents-rock/measurements.jsonl`, global, append-only, `measurementsPath` override; missing file = everything UNCALIBRATED, never an error.
  3. **Ladder** — the 4 rungs + UNCALIBRATED fall-through, verbatim from the spec, plus: per-task `model` override matches that task against its own model's history.
  4. **Math** — the three bands (≥5 lognormal with `σ_log = ln(p95/p50)/1.645`, means sum; 1–4 median + seed spread; 0 seed pert); no `verificationPct` (baselines contain review time); risks in `impactMinutes` with mandatory reason.
  5. **Decomposition rule** — must include human-side operations: ≥1 `planning`-shaped task or the validator refuses; seeds (`seedMinutes` o/m/p) are the agent's only duration judgment and only surface when history is missing.
  6. **Confidence** — the table from the spec, including the variance demotion.
  7. **Sources** — Bernhardsson (lognormal, median-vs-mean, erikbern.com link), Vacanti *Actionable Agile Metrics for Predictability* (percentile cycle-time forecasting), Atomic Object (buffer machinery), note: constants (`1.645`, the ±50% scope window, sample thresholds 3/5/10) are documented starting points — tune against real data.

- [ ] **Step 4: Update `references/interview.md`.** In §2 (after Depth), add §2b:

```markdown
## 2b. Delivery mode — ask second

| Mode | Meaning | Sizing path |
| --- | --- | --- |
| TRADITIONAL | humans write the code | technique menu (`techniques.md`) |
| AGENTIC | AI coding agents write the code, humans plan and review | measurement-based (`agentic-estimation.md`) |

AGENTIC replaces the technique question and AI-category scoring entirely.
Follow-ups it adds: which agent + model executes (calibration context,
written to `agentContext`; ask whether planning uses a different model —
per-task `model` override); per task, a shape from `task-shapes.md`, scope
attributes, and seed minutes (o/m/p) used only when no baseline exists.
```

In §4 (question sequence), note that item 3 (factor scores) is TRADITIONAL-only and AGENTIC asks shape + scope + seed per task instead.

- [ ] **Step 5: Update `references/writing.md`.** Add an "Agentic deliverable additions" section: the `Delivery: agentic (…) · Baselines: …` Summary line; agentic task-table columns (`Task | Baseline (min) | Samples | Match | Confidence | Assumptions | src`), `not estimated` + `UNCALIBRATED` for zero-sample rows; the `### Evidence` section (only script-matched rows, ids must exist in estimation.json); the Risks table in minutes with a Reason column; the calibration nudge line pointing at recording actuals (see `docs/requirements/record-task.md`).

- [ ] **Step 6: Update `references/ai-multipliers.md`.** Add one paragraph at the top: in AGENTIC delivery mode this model is retired from estimation; it survives only as intuition for seed minutes on uncalibrated shapes. Categories/formula unchanged for TRADITIONAL scenarios with AI plans.

- [ ] **Step 7: Update `SKILL.md`.** Flow step 2 becomes depth **and** delivery mode; step 4 (technique) marked TRADITIONAL-only, AGENTIC reads `references/agentic-estimation.md` + `references/task-shapes.md`; hard rule added: `6. Agentic estimates: baselines and confidence come from scripts reading measurements.jsonl — the agent never writes a duration, confidence, or evidence row.` Mention render routes to the agentic template automatically.

- [ ] **Step 8: Run the full suite** — `npm test` → everything green (references tests included).

- [ ] **Step 9: Commit**

```bash
git add plugins/solution-architect/skills/estimate/references/ plugins/solution-architect/skills/estimate/SKILL.md plugins/solution-architect/skills/estimate/scripts/test/references.test.mjs
git commit -m "docs(estimate): agentic estimation references and interview fork"
```

---

### Task 9: End-to-end verification

**Files:**
- Modify: `scripts/test/e2e.test.mjs` (append)

**Interfaces:**
- Consumes: the whole pipeline.

- [ ] **Step 1: Append an e2e test** mirroring the existing one's tmp-dir pattern: agentic fixture inputs (measurementsPath pointed at the fixture jsonl) → `compute.mjs` → write the pass-fixture md → `validate.mjs` (exit 0) → `render.mjs` → assert `estimate.html` exists and contains `Delivery: agentic`. Then break the md with `1–2 hours` and assert `validate.mjs` exits 1.

- [ ] **Step 2: Run `npm test` from repo root** — full suite green (782 pre-existing + all new).

- [ ] **Step 3: Manual smoke** — render the agentic fixture into a tmp dir, open the html, eyeball: badges, evidence table, method fold, what-if sliders working.

- [ ] **Step 4: Commit**

```bash
git add plugins/solution-architect/skills/estimate/scripts/test/e2e.test.mjs
git commit -m "test(estimate): end-to-end agentic estimation pipeline"
```
