# Estimate Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the `arch-docs` plugin to `solution-architect` and add an `estimate` skill that interviews an engineer, computes AI-aware estimates deterministically, and renders an interactive what-if page.

**Architecture:** The skill follows the arch-docs anatomy: SKILL.md drives an adaptive interview, the agent writes judgments to `estimation-inputs.json`, `compute.mjs` does all arithmetic into `estimation.json`, `validate.mjs` gates the deliverables, `render.mjs` embeds data + math into a self-contained `estimate.html`. Formulas live once in `scripts/lib/estimate-math.mjs`, imported by node and inlined into the page, so browser math and node math cannot drift.

**Tech Stack:** Plain Node ≥ 20 ESM (`.mjs`), `node:test` + `assert/strict`, zero npm dependencies, headless-Chrome-over-CDP browser tests reusing arch-docs' `chrome.mjs`/`cdp.mjs`.

**Spec:** `docs/specs/2026-08-04-estimate-skill-design.md`

## Global Constraints

- Quality gates on every `.mjs` under `scripts/` and `scripts/lib/`: file ≤ 200 lines, ≤ 10 functions per file, function ≤ 22 lines incl. braces, ≤ 3 params (use a single object param).
- Zero npm dependencies; no external URLs in any generated HTML (`https?://` forbidden except `www.w3.org`).
- Tests run with `node --test <files>`; import style matches arch-docs (`node:` prefixed builtins, relative `.mjs` imports).
- Provenance vocabulary is exactly: `observed` · `stated` · `researched` · `proposed`.
- Estimate rows never contain `0` as an estimate; the honest absence is `not estimated`.
- No LLM arithmetic: every number in `estimation.json` comes from `compute.mjs`.
- Commits: Conventional Commits, no AI attribution trailers.
- Paths below abbreviate `EST = plugins/solution-architect/skills/estimate` and `ARCH = plugins/solution-architect/skills/arch-docs`.

---

### Task 1: Rename plugin `arch-docs` → `solution-architect`

The plugin directory, manifest name, and marketplace entry rename. The two **skills** inside keep their names (`arch-docs`, and later `estimate`). The npx installer discovers plugins by reading `.claude-plugin/plugin.json`, so only the `-p` flag value in tests changes — skill-path assertions (`skills/arch-docs/...`) stay as they are.

**Files:**
- Rename: `plugins/arch-docs/` → `plugins/solution-architect/` (git mv)
- Modify: `plugins/solution-architect/.claude-plugin/plugin.json`
- Modify: `.claude-plugin/marketplace.json`
- Modify: `tests/args.test.mjs:19-20`, `tests/cli.test.mjs` (every `-p arch-docs` / `'arch-docs'` plugin-name usage)
- Modify: `README.md:14,21-22`

**Interfaces:**
- Produces: plugin id `solution-architect` at `plugins/solution-architect/`; all later tasks create files under `plugins/solution-architect/skills/estimate/`.

- [ ] **Step 1: Turn the installer tests red**

In `tests/args.test.mjs`, change the plugin-name expectations:

```js
const r = parseCliArgs(['-p', 'solution-architect', '-a', 'claude', '-f']);
assert.deepEqual(r.plugins, ['solution-architect']);
```

In `tests/cli.test.mjs`, change every `-p` value from `'arch-docs'` to `'solution-architect'` and the test title to `installs solution-architect for both agents via flags`. Keep the skill-path assertions untouched (`.agents/skills/arch-docs/SKILL.md` — the skill is still named arch-docs). Check `tests/install.test.mjs`, `tests/registry.test.mjs`, `tests/picker.test.mjs`, `tests/uninstall.test.mjs` for the same plugin-name literal and update those too.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — registry finds no plugin named `solution-architect`.

- [ ] **Step 3: Rename the plugin**

```bash
git mv plugins/arch-docs plugins/solution-architect
```

In `plugins/solution-architect/.claude-plugin/plugin.json` set:

```json
"name": "solution-architect",
"description": "Solution-architecture toolkit: interview-driven architecture documentation with interactive diagrams and provenance-tagged facts, plus AI-aware project estimation."
```

In `.claude-plugin/marketplace.json` update the plugin entry: `"name": "solution-architect"`, `"source": "./plugins/solution-architect"`, same description as above, and add `"estimation"` to `keywords`.

In `README.md` update install lines to `-p solution-architect` and `/plugin install solution-architect@claude-rock`.

- [ ] **Step 4: Run all suites to verify green, including the moved skill's own tests**

Run: `npm test && node --test plugins/solution-architect/skills/arch-docs/scripts/test/`
Expected: PASS everywhere with the arch-docs skill tests unmodified — that is the regression gate for the rename.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(plugin): rename arch-docs plugin to solution-architect"
```

---

### Task 2: Estimate skill scaffold + quality-gates test

**Files:**
- Create: `EST/scripts/lib/.gitkeep` (removed once first lib lands), `EST/scripts/test/fixtures/.gitkeep`, `EST/references/.gitkeep`, `EST/assets/.gitkeep`
- Create: `EST/scripts/test/quality-gates.test.mjs`

**Interfaces:**
- Produces: the gates test that every later `.mjs` in this skill must pass.

- [ ] **Step 1: Write the gates test**

Copy `ARCH/scripts/test/quality-gates.test.mjs` to `EST/scripts/test/quality-gates.test.mjs` verbatim, then change only the targets line (this skill has no `workflows/`):

```js
const targets = ['scripts/lib', 'scripts']
```

- [ ] **Step 2: Run it**

Run: `node --test plugins/solution-architect/skills/estimate/scripts/test/quality-gates.test.mjs`
Expected: PASS (zero files scanned yet — the suite is a standing guard, it turns on as code lands).

- [ ] **Step 3: Commit**

```bash
git add plugins/solution-architect/skills/estimate
git commit -m "feat(estimate): scaffold estimate skill with quality gates"
```

---

### Task 3: `estimate-math.mjs` — pure formulas

**Files:**
- Create: `EST/scripts/lib/estimate-math.mjs`
- Test: `EST/scripts/test/estimate-math.test.mjs`

**Interfaces:**
- Produces (exact signatures — compute.mjs, the page JS, and validate.mjs all call these):

```js
export const AI_CATEGORIES = {
  boilerplate: { min: 0.5, max: 0.8 },   // CRUD, tests, docs, scaffolding
  logic:       { min: 0.2, max: 0.4 },   // business logic, integrations
  novel:       { min: 0.0, max: 0.1 },   // architecture, novel algorithms, UX
};
export const SENIORITY_FACTOR = { junior: 1.15, mid: 1.0, senior: 0.85 };
export const HOURS_PER_MONTH = 140;      // effective delivery hours per engineer-month
export const COORDINATION_TAX = 0.10;    // capacity lost per additional engineer
export const PLAN_PRICES = { none: 0, max5x: 100, max20x: 200 }; // USD/seat/month
export const TIER_BREAKS = [{ max: 10, tier: 'S' }, { max: 17, tier: 'M' }, { max: Infinity, tier: 'L' }];

export function pert({ o, m, p })                 // → { e, sigma }
export function projectBuffer(sigmas)             // number[] → √Σσ²
export function tierFor(scores)                   // {complexity,size,dependencies,uncertainty,risk} 1-5 each → { total, tier }
export function aiAdjust({ e, category, seniority, verificationPct, scale }) // → adjusted hours (number)
export function riskBufferHours(risks)            // [{probability, impactHours}] → Σ p×impact
export function effectiveCapacity(engineers)      // count → engineers × (1 − TAX×(n−1)), min value 1×(no tax)
export function scenarioRollup({ hours, team, plan }) // → { months, laborCost, planCost, totalCost }
```

`aiAdjust` semantics (Kmino): `tr = e`; category reduction midpoint `red = (min+max)/2 × SENIORITY_FACTOR[seniority] × scale`, clamped to `[0, 0.9]`; max reduction `redMax = max × factor × scale` clamped the same; `ar = tr×(1−red)`, `ao = tr×(1−redMax)`; result `((ao + 2×ar + tr) / 4) × (1 + verificationPct)`. `scale` defaults to 1 (the page's AI slider passes 0–1.5).

`scenarioRollup` semantics: `team` is `[{ seniority, rate }]`; `months = hours / (effectiveCapacity(team.length) × HOURS_PER_MONTH)`; `laborCost = months × Σ(rate × HOURS_PER_MONTH)`; `planCost = months × PLAN_PRICES[plan] × team.length`; `totalCost = laborCost + planCost`.

- [ ] **Step 1: Write the failing tests**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  pert, projectBuffer, tierFor, aiAdjust, riskBufferHours,
  effectiveCapacity, scenarioRollup,
} from '../lib/estimate-math.mjs';

const close = (got, want) => assert.ok(Math.abs(got - want) < 1e-9, `${got} !~ ${want}`);

test('pert: E=(O+4M+P)/6, sigma=(P-O)/6', () => {
  const { e, sigma } = pert({ o: 16, m: 24, p: 40 });
  close(e, 152 / 6);
  close(sigma, 4);
});

test('project buffer is sqrt of summed squares, not a naive sum', () => {
  close(projectBuffer([4, 3]), 5);
  close(projectBuffer([]), 0);
});

test('factor scores map to tiers at the documented breaks', () => {
  // user's real example: 2+3+5+3+4 = 17 → M
  assert.deepEqual(tierFor({ complexity: 2, size: 3, dependencies: 5, uncertainty: 3, risk: 4 }),
    { total: 17, tier: 'M' });
  assert.equal(tierFor({ complexity: 1, size: 1, dependencies: 2, uncertainty: 3, risk: 3 }).tier, 'S');
  assert.equal(tierFor({ complexity: 5, size: 4, dependencies: 4, uncertainty: 3, risk: 2 }).tier, 'L');
});

test('aiAdjust applies (AO + 2AR + TR)/4 plus verification overhead', () => {
  const e = 152 / 6; // boilerplate, mid: red=0.65, redMax=0.8
  const want = ((e * 0.2 + 2 * (e * 0.35) + e) / 4) * 1.12;
  close(aiAdjust({ e, category: 'boilerplate', seniority: 'mid', verificationPct: 0.12, scale: 1 }), want);
});

test('aiAdjust clamps reduction at 0.9 for outsized scale', () => {
  const got = aiAdjust({ e: 100, category: 'boilerplate', seniority: 'junior', verificationPct: 0, scale: 1.5 });
  const red = 0.9; // 0.65 × 1.15 × 1.5 = 1.121 → clamped
  close(got, (100 * (1 - red) * 3 + 100) / 4); // redMax also clamps to 0.9 so ao == ar
});

test('risk buffer is probability times impact, summed', () => {
  close(riskBufferHours([{ probability: 0.3, impactHours: 40 }, { probability: 0.5, impactHours: 16 }]), 20);
});

test('capacity pays a coordination tax per added engineer', () => {
  close(effectiveCapacity(1), 1);
  close(effectiveCapacity(2), 1.8);
  close(effectiveCapacity(3), 2.4);
});

test('scenarioRollup: 1008h, 2 mid @45, max5x → 4.0mo, $51,200', () => {
  const team = [{ seniority: 'mid', rate: 45 }, { seniority: 'mid', rate: 45 }];
  const got = scenarioRollup({ hours: 1008, team, plan: 'max5x' });
  close(got.months, 4);
  close(got.laborCost, 50400);
  close(got.planCost, 800);
  close(got.totalCost, 51200);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test plugins/solution-architect/skills/estimate/scripts/test/estimate-math.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `estimate-math.mjs`**

```js
// Every formula the estimate ships — imported by compute.mjs at build time and
// inlined verbatim into estimate-template.html at render time, so the browser's
// what-if math and the committed numbers cannot drift apart.

export const AI_CATEGORIES = {
  boilerplate: { min: 0.5, max: 0.8 },
  logic: { min: 0.2, max: 0.4 },
  novel: { min: 0.0, max: 0.1 },
};
export const SENIORITY_FACTOR = { junior: 1.15, mid: 1.0, senior: 0.85 };
export const HOURS_PER_MONTH = 140;
export const COORDINATION_TAX = 0.10;
export const PLAN_PRICES = { none: 0, max5x: 100, max20x: 200 };
export const TIER_BREAKS = [
  { max: 10, tier: 'S' }, { max: 17, tier: 'M' }, { max: Infinity, tier: 'L' },
];

export function pert({ o, m, p }) {
  return { e: (o + 4 * m + p) / 6, sigma: (p - o) / 6 };
}

export function projectBuffer(sigmas) {
  return Math.sqrt(sigmas.reduce((sum, s) => sum + s * s, 0));
}

export function tierFor(scores) {
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  return { total, tier: TIER_BREAKS.find((b) => total <= b.max).tier };
}

const clampRed = (r) => Math.min(Math.max(r, 0), 0.9);

export function aiAdjust({ e, category, seniority, verificationPct, scale = 1 }) {
  const { min, max } = AI_CATEGORIES[category];
  const factor = SENIORITY_FACTOR[seniority] * scale;
  const red = clampRed(((min + max) / 2) * factor);
  const redMax = clampRed(max * factor);
  const [tr, ar, ao] = [e, e * (1 - red), e * (1 - redMax)];
  return ((ao + 2 * ar + tr) / 4) * (1 + verificationPct);
}

export function riskBufferHours(risks) {
  return risks.reduce((sum, r) => sum + r.probability * r.impactHours, 0);
}

export function effectiveCapacity(engineers) {
  return engineers * (1 - COORDINATION_TAX * (engineers - 1));
}

export function scenarioRollup({ hours, team, plan }) {
  const months = hours / (effectiveCapacity(team.length) * HOURS_PER_MONTH);
  const laborCost = months * team.reduce((sum, t) => sum + t.rate * HOURS_PER_MONTH, 0);
  const planCost = months * PLAN_PRICES[plan] * team.length;
  return { months, laborCost, planCost, totalCost: laborCost + planCost };
}
```

Delete `EST/scripts/lib/.gitkeep`.

- [ ] **Step 4: Run tests + gates to verify green**

Run: `node --test plugins/solution-architect/skills/estimate/scripts/test/`
Expected: PASS, including quality gates now scanning the new file.

- [ ] **Step 5: Commit**

```bash
git add plugins/solution-architect/skills/estimate/scripts
git commit -m "feat(estimate): deterministic estimation formulas"
```

---

### Task 4: Input schema + booking-app fixture

**Files:**
- Create: `EST/scripts/lib/schema.mjs`
- Create: `EST/scripts/test/fixtures/booking-inputs.json`
- Test: `EST/scripts/test/schema.test.mjs`

**Interfaces:**
- Produces: `export function checkInputs(inputs)` → `string[]` of findings, empty means valid. compute.mjs refuses on non-empty.
- Produces: the canonical `estimation-inputs.json` shape every fixture and the SKILL.md interview target:

```json
{
  "project": "Booking App",
  "currency": "USD",
  "technique": "three-point-pert",
  "depth": "STANDARD",
  "calibration": { "S": [20, 60], "M": [60, 160], "L": [160, 400] },
  "overheadPct": 0.35,
  "verificationPct": 0.12,
  "exposeRatesToClient": false,
  "features": [
    {
      "id": "booking",
      "name": "User can book appointment",
      "provenance": "stated",
      "tasks": [
        { "id": "booking-api", "name": "Booking CRUD API", "category": "boilerplate",
          "o": 16, "m": 24, "p": 40, "confidence": "HIGH",
          "assumptions": ["single timezone"], "provenance": "stated" },
        { "id": "booking-rules", "name": "Slot conflict + cancellation rules", "category": "logic",
          "o": 24, "m": 40, "p": 80, "confidence": "MED",
          "assumptions": ["no recurring bookings in v1"], "provenance": "proposed" }
      ]
    },
    {
      "id": "reminders",
      "name": "Email reminders",
      "provenance": "proposed",
      "tasks": [
        { "id": "reminder-jobs", "name": "Scheduled reminder jobs", "category": "logic",
          "o": 12, "m": 20, "p": 36, "confidence": "MED",
          "assumptions": ["transactional email provider already chosen"], "provenance": "proposed" }
      ]
    }
  ],
  "risks": [
    { "name": "payment gateway sandbox delays", "probability": 0.3, "impactHours": 40 }
  ],
  "assumptions": [
    { "text": "single timezone", "impactIfWrong": "recompute booking-api at logic category, +30%" }
  ],
  "scenarios": [
    { "id": "3eng-noai", "plan": "none",
      "team": [{ "seniority": "mid", "rate": 45 }, { "seniority": "mid", "rate": 45 }, { "seniority": "junior", "rate": 30 }] },
    { "id": "2eng-max5x", "plan": "max5x",
      "team": [{ "seniority": "senior", "rate": 60 }, { "seniority": "mid", "rate": 45 }] }
  ],
  "recommendedScenario": "2eng-max5x"
}
```

- [ ] **Step 1: Write the failing tests**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkInputs } from '../lib/schema.mjs';

const fixture = () => JSON.parse(
  readFileSync(new URL('./fixtures/booking-inputs.json', import.meta.url), 'utf8'));

test('the booking fixture is valid', () => {
  assert.deepEqual(checkInputs(fixture()), []);
});

test('every defect is named with its path', () => {
  const bad = fixture();
  bad.features[0].tasks[0].o = 50;                    // o > m
  bad.features[0].tasks[1].category = 'ai-magic';     // unknown category
  bad.features[1].provenance = 'guessed';             // not in the vocabulary
  delete bad.features[0].tasks[0].assumptions;        // missing register
  bad.recommendedScenario = 'ghost';                  // not a scenario id
  const findings = checkInputs(bad);
  assert.equal(findings.length, 5);
  assert.ok(findings.some((f) => f.includes('booking-api') && f.includes('o <= m <= p')));
  assert.ok(findings.some((f) => f.includes('booking-rules') && f.includes('category')));
  assert.ok(findings.some((f) => f.includes('reminders') && f.includes('provenance')));
  assert.ok(findings.some((f) => f.includes('booking-api') && f.includes('assumptions')));
  assert.ok(findings.some((f) => f.includes('recommendedScenario')));
});

test('zero estimates are refused — the honest absence is "not estimated"', () => {
  const bad = fixture();
  bad.features[0].tasks[0].m = 0;
  assert.ok(checkInputs(bad).some((f) => f.includes('never 0')));
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test plugins/solution-architect/skills/estimate/scripts/test/schema.test.mjs`
Expected: FAIL — fixture and module missing.

- [ ] **Step 3: Write the fixture and `schema.mjs`**

Write `fixtures/booking-inputs.json` exactly as shown in Interfaces above. Then:

```js
// Shape checks for estimation-inputs.json — the agent writes that file, so the
// checks here are the contract that keeps interview output honest before any
// arithmetic happens. Findings are strings with the offending id in them.
import { AI_CATEGORIES } from './estimate-math.mjs';

const PROVENANCE = ['observed', 'stated', 'researched', 'proposed'];
const CONFIDENCE = ['HIGH', 'MED', 'LOW'];

function checkTask(task, out) {
  if (!(task.o > 0 && task.m > 0 && task.p > 0)) out.push(`task ${task.id}: estimates are never 0`);
  if (!(task.o <= task.m && task.m <= task.p)) out.push(`task ${task.id}: expected o <= m <= p`);
  if (!(task.category in AI_CATEGORIES)) out.push(`task ${task.id}: unknown category "${task.category}"`);
  if (!CONFIDENCE.includes(task.confidence)) out.push(`task ${task.id}: confidence must be HIGH|MED|LOW`);
  if (!Array.isArray(task.assumptions)) out.push(`task ${task.id}: assumptions array is required`);
  if (!PROVENANCE.includes(task.provenance)) out.push(`task ${task.id}: provenance not in vocabulary`);
}

function checkFeature(feature, out) {
  if (!PROVENANCE.includes(feature.provenance)) out.push(`feature ${feature.id}: provenance not in vocabulary`);
  for (const task of feature.tasks ?? []) checkTask(task, out);
}

function checkScenarios(inputs, out) {
  const ids = (inputs.scenarios ?? []).map((s) => s.id);
  if (!ids.includes(inputs.recommendedScenario)) out.push('recommendedScenario names no scenario');
  for (const s of inputs.scenarios ?? []) {
    if (!s.team?.length) out.push(`scenario ${s.id}: empty team`);
  }
}

export function checkInputs(inputs) {
  const out = [];
  for (const key of ['project', 'technique', 'features', 'risks', 'assumptions', 'scenarios']) {
    if (!(key in inputs)) out.push(`missing top-level "${key}"`);
  }
  for (const feature of inputs.features ?? []) checkFeature(feature, out);
  checkScenarios(inputs, out);
  return out;
}
```

Note: with `m = 0` the fixture task also trips `o <= m` — the zero test asserts only that the `never 0` finding exists, so overlap is fine.

- [ ] **Step 4: Run tests + gates to verify green**

Run: `node --test plugins/solution-architect/skills/estimate/scripts/test/`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add plugins/solution-architect/skills/estimate/scripts
git commit -m "feat(estimate): input schema checks and booking fixture"
```

---

### Task 5: `compute.mjs` — deterministic pipeline CLI

**Files:**
- Create: `EST/scripts/compute.mjs`
- Create: `EST/scripts/lib/rollup.mjs`
- Test: `EST/scripts/test/compute.test.mjs`

**Interfaces:**
- Consumes: `checkInputs` (Task 4), all of `estimate-math.mjs` (Task 3).
- Produces: CLI `node compute.mjs --inputs <estimation-inputs.json> --out <estimation.json>`; prints the out path; exits 1 printing findings when the schema check fails.
- Produces: `export function computeEstimation(inputs)` in `rollup.mjs` → the `estimation.json` object (validate.mjs re-calls this in Task 6). Output shape:

```json
{
  "inputs": { "...the whole inputs file echoed verbatim..." },
  "computed": {
    "tasks": { "booking-api": { "e": 25.33, "sigma": 4 } },
    "features": { "booking": { "hours": 69.33, "low": 40, "high": 120 } },
    "devHours": 90.67, "overheadHours": 31.73, "spreadBufferHours": 10.91, "riskBufferHours": 12,
    "scenarios": { "2eng-max5x": { "taskHours": { "booking-api": 13.48 },
      "hours": 0, "months": 0, "laborCost": 0, "planCost": 0, "totalCost": 0, "notes": [] } },
    "projectConfidence": "MED"
  }
}
```

(zeros above stand for "computed number" in this shape sketch; the fixture's real values are pinned by the tests and Step 4's compute run)

Computation rules, all in `rollup.mjs`:
- Per task: `pert({o,m,p})` → `e`, `sigma`. AI-adjusted hours are per (task × scenario), because seniority mix differs by scenario: `scenarios[id].taskHours[taskId]`. Seniority passed to `aiAdjust` = the scenario team's most common seniority (ties resolve to the more senior — deterministic).
- Feature hours = Σ task `e` (traditional); `low/high` = Σ task `o` / Σ task `p`.
- `devHours` = Σ feature hours; `overheadHours = devHours × overheadPct`; `spreadBufferHours = projectBuffer(all sigmas)`; `riskBufferHours = riskBufferHours(risks)`.
- Per scenario: task hours use `ai[...]` when `plan !== 'none'`, else `e`; scenario `hours = Σ taskHours + overhead(on that Σ) + spreadBuffer + riskBuffer`; then `scenarioRollup({hours, team, plan})`. `notes`: push `'bus factor: single engineer'` when team length is 1, `'coordination overhead grows past 3 engineers'` when > 3.
- `projectConfidence`: find the feature with the most traditional hours (the critical path), take the worst confidence among its tasks (LOW < MED < HIGH).
- Determinism: build every object with keys in sorted order (`Object.keys(...).sort()` when assembling maps); serialize with `JSON.stringify(obj, null, 2)`.
- Rounding: all arithmetic runs on unrounded values; a single `round2` helper applies once, to each field, at final assembly. So `devHours = round2(152/6 + 44 + 128/6) = 90.67`, even though the displayed task values are 25.33 / 44 / 21.33.

- [ ] **Step 1: Write the failing tests**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { computeEstimation } from '../lib/rollup.mjs';

const fixturePath = new URL('./fixtures/booking-inputs.json', import.meta.url).pathname;
const fixture = () => JSON.parse(readFileSync(fixturePath, 'utf8'));
const cli = new URL('../compute.mjs', import.meta.url).pathname;

test('golden numbers for the booking fixture', () => {
  const { computed } = computeEstimation(fixture());
  // pert(16,24,40)=25.33/σ4 · pert(24,40,80)=44/σ9.33 · pert(12,20,36)=21.33/σ4
  assert.equal(computed.tasks['booking-api'].e, 25.33);
  assert.equal(computed.tasks['booking-rules'].e, 44);
  assert.equal(computed.tasks['reminder-jobs'].e, 21.33);
  assert.equal(computed.devHours, 90.67);               // round2(152/6 + 44 + 128/6)
  assert.equal(computed.overheadHours, 31.73);          // round2(90.6667 × 0.35)
  assert.equal(computed.spreadBufferHours, 10.91);      // round2(√(4² + 9.3333² + 4²))
  assert.equal(computed.riskBufferHours, 12);           // 0.3 × 40
  assert.equal(computed.projectConfidence, 'MED');      // critical path = booking, worst row MED
  const rec = computed.scenarios['2eng-max5x'];
  assert.ok(rec.months > 0 && rec.totalCost > 0);
  assert.equal(rec.totalCost, rec.laborCost + rec.planCost);
  // AI hours strictly below traditional on every task in an AI scenario
  for (const id of Object.keys(computed.tasks)) {
    assert.ok(rec.taskHours[id] < computed.tasks[id].e);
  }
});

test('CLI writes byte-identical output on repeat runs', () => {
  const dir = mkdtempSync(join(tmpdir(), 'estimate-'));
  const out = join(dir, 'estimation.json');
  execFileSync('node', [cli, '--inputs', fixturePath, '--out', out]);
  const first = readFileSync(out, 'utf8');
  execFileSync('node', [cli, '--inputs', fixturePath, '--out', out]);
  assert.equal(readFileSync(out, 'utf8'), first);
  assert.deepEqual(JSON.parse(first).inputs, fixture()); // inputs echoed verbatim
});

test('CLI refuses invalid inputs, naming findings', () => {
  const dir = mkdtempSync(join(tmpdir(), 'estimate-'));
  const badPath = join(dir, 'bad.json');
  writeFileSync(badPath, JSON.stringify({ ...fixture(), recommendedScenario: 'ghost' }));
  assert.throws(
    () => execFileSync('node', [cli, '--inputs', badPath, '--out', join(dir, 'x.json')], { encoding: 'utf8' }),
    (err) => /recommendedScenario/.test(err.stderr ?? err.stdout ?? String(err)),
  );
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test plugins/solution-architect/skills/estimate/scripts/test/compute.test.mjs`
Expected: FAIL — `rollup.mjs` and `compute.mjs` missing.

- [ ] **Step 3: Implement `rollup.mjs` then `compute.mjs`**

`rollup.mjs` — assemble exactly per the computation rules in Interfaces. Keep it within gates by splitting helpers: `round2(n)`, `dominantSeniority(team)`, `taskHoursFor(scenario, tasks)`, `scenarioBlock(scenario, ctx)`, `criticalConfidence(features, tasks)`, then `computeEstimation(inputs)` orchestrating. Every map is built as `Object.fromEntries(entries.sort(([a],[b]) => a.localeCompare(b)))`.

`compute.mjs` — the CLI wrapper:

```js
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { checkInputs } from './lib/schema.mjs';
import { computeEstimation } from './lib/rollup.mjs';

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith('--')) args[argv[i].slice(2)] = argv[++i];
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const inputs = JSON.parse(readFileSync(args.inputs, 'utf8'));
const findings = checkInputs(inputs);
if (findings.length) {
  console.error(findings.join('\n'));
  process.exit(1);
}
mkdirSync(dirname(args.out), { recursive: true });
writeFileSync(args.out, `${JSON.stringify(computeEstimation(inputs), null, 2)}\n`);
console.log(args.out);
```

- [ ] **Step 4: Run tests + gates to verify green**

Run: `node --test plugins/solution-architect/skills/estimate/scripts/test/`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add plugins/solution-architect/skills/estimate/scripts
git commit -m "feat(estimate): deterministic compute pipeline"
```

---

### Task 6: `validate.mjs` — deliverable gate

**Files:**
- Create: `EST/scripts/validate.mjs`
- Create: `EST/scripts/lib/checks.mjs`
- Create: `EST/scripts/test/fixtures/estimation-pass.md`, `EST/scripts/test/fixtures/estimation-fail.md`
- Test: `EST/scripts/test/validate.test.mjs`

**Interfaces:**
- Consumes: `computeEstimation` (Task 5) to recompute totals.
- Produces: CLI `node validate.mjs --md <estimation.md> --json <estimation.json>` → exit 0 clean / exit 1 with one finding per line.
- Produces: `export function checkDeliverables({ md, estimation })` in `checks.mjs` → `string[]`.

Rules enforced (each one line in `checks.mjs`, each with a fail fixture case):
1. `## Summary` and `## Estimation detail` sections both present.
2. `Out of scope` heading present in the Summary part.
3. Assumptions register (a `### Assumptions` block with ≥ 1 table row) non-empty.
4. A `buffer` line item appears in the Summary (`/buffer/i` in a table row).
5. Detail table rows (rows under `## Estimation detail` with ≥ 6 cells): last cell is a provenance word; a `confidence` cell matching HIGH|MED|LOW; no bare `0` in any estimate cell — `not estimated` is the allowed absence.
6. Every scope row carries `stated` or `proposed`.
7. JSON totals: `computeEstimation(estimation.inputs).computed` deep-equals `estimation.computed` (catches hand-edits).
8. Ranges ordered: for each feature in `estimation.computed.features`, `low <= hours <= high`.

- [ ] **Step 1: Write the fixtures**

`estimation-pass.md` — a complete, minimal deliverable for the booking fixture, real content following the spec structure:

```markdown
# Booking App — Estimation

## Summary

| Feature | Tier | Range (h) | src |
| --- | --- | --- | --- |
| User can book appointment | M | 40–120 | stated |
| Email reminders | S | 12–36 | proposed |

Recommended delivery: 2 engineers (1 senior, 1 mid) + Claude Code Max 5x — see detail.

| Line | Hours |
| --- | --- |
| Development | 90.67 |
| Overhead (35%) | 31.73 |
| Risk buffer | 12 |
| Estimate-spread buffer | 10.91 |

### Assumptions

| Assumption | Impact if wrong |
| --- | --- |
| single timezone | recompute booking-api at logic category, +30% |

### Out of scope

- Recurring bookings
- SMS reminders

## Estimation detail

Technique: three-point PERT — detailed backlog available.

| Task | Category | O/M/P | E (h) | Confidence | Assumptions | src |
| --- | --- | --- | --- | --- | --- | --- |
| Booking CRUD API | boilerplate | 16/24/40 | 25.33 | HIGH | single timezone | stated |
| Slot conflict + cancellation rules | logic | 24/40/80 | 44 | MED | no recurring bookings in v1 | proposed |
| Scheduled reminder jobs | logic | 12/20/36 | 21.33 | MED | provider already chosen | proposed |
```

`estimation-fail.md` — copy of the pass fixture with five seeded violations: `0` in an estimate cell, one detail row missing its `src` cell, assumptions register emptied, buffer rows deleted, `Out of scope` heading deleted.

- [ ] **Step 2: Write the failing tests**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { checkDeliverables } from '../lib/checks.mjs';
import { computeEstimation } from '../lib/rollup.mjs';

const read = (f) => readFileSync(new URL(`./fixtures/${f}`, import.meta.url), 'utf8');
const inputs = () => JSON.parse(read('booking-inputs.json'));

test('the pass fixture passes', () => {
  assert.deepEqual(
    checkDeliverables({ md: read('estimation-pass.md'), estimation: computeEstimation(inputs()) }), []);
});

test('each seeded violation is caught by name', () => {
  const findings = checkDeliverables({ md: read('estimation-fail.md'), estimation: computeEstimation(inputs()) });
  for (const needle of ['never 0', 'src', 'assumptions register', 'buffer', 'out of scope']) {
    assert.ok(findings.some((f) => f.toLowerCase().includes(needle)), `no finding for: ${needle}`);
  }
});

test('hand-edited totals are refused', () => {
  const est = computeEstimation(inputs());
  est.computed.devHours += 10;
  const findings = checkDeliverables({ md: read('estimation-pass.md'), estimation: est });
  assert.ok(findings.some((f) => f.includes('recomputed')));
});
```

Adjust the pass fixture's Development/buffer numbers to whatever `computeEstimation` actually produced in Task 5 (read them from a compute run) — the fixture must be honest before the test can pass.

- [ ] **Step 3: Run to verify failure, implement, run to verify green**

Run: `node --test plugins/solution-architect/skills/estimate/scripts/test/validate.test.mjs` → FAIL → implement `checks.mjs` (one small function per rule, a `checkDeliverables` that concatenates them — mind the 10-function gate: group rules 1-4 into `checkStructure(md)`, 5-6 into `checkRows(md)`, 7-8 into `checkNumbers(estimation)`; the rule-7 finding text must contain the word `recomputed`, e.g. `computed block does not match recomputed totals`) and the `validate.mjs` CLI (same argv pattern as compute.mjs, prints findings, exits 1 on any) → PASS including gates.

- [ ] **Step 4: Commit**

```bash
git add plugins/solution-architect/skills/estimate/scripts
git commit -m "feat(estimate): deliverable validation gate"
```

---

### Task 7: `estimate-template.html` + `render.mjs`

**Files:**
- Create: `EST/assets/estimate-template.html`
- Create: `EST/scripts/render.mjs`
- Create: `EST/scripts/lib/inline.mjs`
- Test: `EST/scripts/test/render.test.mjs`

**Interfaces:**
- Consumes: `embed` from `ARCH/scripts/lib/embed.mjs`, `buildFontFaces` from `ARCH/scripts/lib/fonts.mjs` (relative import `../../arch-docs/scripts/lib/…` — same plugin, stable path).
- Produces: CLI `node render.mjs --json <estimation.json> --out <dir> [--client-only]` → writes `<dir>/estimate.html`, prints the path.
- Produces: template slots `TITLE`, `FONTS`, `DATA`, `MATH`; internal-only markup wrapped in `<!-- internal:start -->…<!-- internal:end -->`; `inline.mjs` exports `inlineModule(src)` (strips `export ` prefixes so the math module runs as a plain script) and `stripInternal(html)`.

Template skeleton (the real file fleshes out CSS and sections; every structural element below is required):

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><!-- slot:TITLE --> — Estimate</title>
<style>
<!-- slot:FONTS -->
:root { --bg:#faf9f6; --ink:#1a1a1a; --accent:#0f766e; --warn:#b45309; --bad:#b91c1c; --ok:#15803d; --card:#fff; }
:root[data-theme="dark"] { --bg:#111312; --ink:#e8e6e1; --card:#1c1f1e; }
body { font-family:'IBM Plex Sans',system-ui,sans-serif; background:var(--bg); color:var(--ink); margin:0; }
/* layout: header bar, two-column grid (main charts | controls rail), full-width feature table */
.view-client [data-internal] { display:none; }
/* bars and gantt rows are styled divs — width set inline from data, no canvas, printable */
</style>
</head>
<body>
<header>
  <h1><!-- slot:TITLE --></h1>
  <span id="confidence-badge"></span>
  <button id="theme-toggle" type="button">theme</button>
  <!-- internal:start --><button id="view-toggle" type="button" data-internal>client view</button><!-- internal:end -->
</header>
<p id="modified-banner" hidden>modified from committed estimate — <button id="reset" type="button">reset</button></p>
<main>
  <section id="scenario-cards"></section>
  <!-- internal:start -->
  <aside id="controls" data-internal>
    <label>engineers <input id="ctl-engineers" type="number" min="1" max="8" step="1"></label>
    <label>seniority <select id="ctl-seniority"><option>junior</option><option>mid</option><option>senior</option></select></label>
    <label>claude plan <select id="ctl-plan"><option>none</option><option>max5x</option><option>max20x</option></select></label>
    <label>hourly rate <input id="ctl-rate" type="number" min="10" max="300" step="5"></label>
    <label>AI multiplier <input id="ctl-ai" type="range" min="0" max="1.5" step="0.05"></label>
    <label>risk buffer <input id="ctl-buffer" type="range" min="0" max="2" step="0.1"></label>
    <label>overhead % <input id="ctl-overhead" type="range" min="0" max="0.6" step="0.05"></label>
  </aside>
  <!-- internal:end -->
  <section id="cost-bars"></section>
  <section id="timeline"></section>
  <section id="feature-table"></section>
  <section id="register"></section>
</main>
<script type="application/json" id="estimation-data"><!-- slot:DATA --></script>
<script>
<!-- slot:MATH -->
/* page code: parse #estimation-data, render sections, wire controls (Task 8) */
</script>
</body>
</html>
```

- [ ] **Step 1: Write the failing tests**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inlineModule, stripInternal } from '../lib/inline.mjs';

const tpl = () => readFileSync(new URL('../../assets/estimate-template.html', import.meta.url), 'utf8');
const cli = new URL('../render.mjs', import.meta.url).pathname;
const fixture = new URL('./fixtures/booking-inputs.json', import.meta.url).pathname;
const computeCli = new URL('../compute.mjs', import.meta.url).pathname;

function renderedPage(extra = []) {
  const dir = mkdtempSync(join(tmpdir(), 'estimate-render-'));
  const json = join(dir, 'estimation.json');
  execFileSync('node', [computeCli, '--inputs', fixture, '--out', json]);
  execFileSync('node', [cli, '--json', json, '--out', dir, ...extra]);
  return readFileSync(join(dir, 'estimate.html'), 'utf8');
}

test('template carries exactly the four slots and no external URLs', () => {
  const markers = [...tpl().matchAll(/<!-- slot:(\w+) -->/g)].map((m) => m[1]).sort();
  assert.deepEqual([...new Set(markers)], ['DATA', 'FONTS', 'MATH', 'TITLE']);
  assert.doesNotMatch(tpl(), /https?:\/\/(?!www\.w3\.org)/);
});

test('inlineModule strips export keywords and nothing else', () => {
  assert.equal(inlineModule('export function f() {}\nexport const X = 1;\nconst y = 2;'),
    'function f() {}\nconst X = 1;\nconst y = 2;');
});

test('rendered page is self-contained and carries parseable data', () => {
  const html = renderedPage();
  assert.doesNotMatch(html, /<!-- slot:/);
  assert.match(html, /@font-face/);
  const data = html.match(/<script type="application\/json" id="estimation-data">([\s\S]*?)<\/script>/)[1];
  assert.equal(JSON.parse(data).inputs.project, 'Booking App');
  assert.match(html, /function pert\(/); // math inlined, not referenced
});

test('--client-only strips every internal range', () => {
  const html = renderedPage(['--client-only']);
  assert.doesNotMatch(html, /data-internal|internal:start|ctl-engineers/);
  assert.match(stripInternal('a<!-- internal:start -->X<!-- internal:end -->b'), /^ab$/);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test plugins/solution-architect/skills/estimate/scripts/test/render.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Implement**

`inline.mjs`:

```js
// The math module is written once as ESM and shipped twice: imported by
// compute.mjs, and inlined here as a plain script so the page's what-if
// controls run the very same formulas the committed numbers came from.
export function inlineModule(src) {
  return src.replaceAll(/^export /gm, '');
}

export function stripInternal(html) {
  return html.replaceAll(/<!-- internal:start -->[\s\S]*?<!-- internal:end -->/g, '');
}
```

`render.mjs`: parse argv (same pattern as compute.mjs); read `estimation.json`; read the template; `embed({ template, slots: { TITLE: estimation.inputs.project, FONTS: buildFontFaces(archFontsDir), DATA: JSON.stringify(estimation), MATH: inlineModule(readFileSync(mathPath, 'utf8')) } })`; when `--client-only`, run `stripInternal` on the result and inject `<body class="view-client"` in place of `<body`; write `<dir>/estimate.html`. `archFontsDir` is `new URL('../../arch-docs/assets/fonts/', import.meta.url).pathname`, `mathPath` is `new URL('./lib/estimate-math.mjs', import.meta.url).pathname`.

Escaping guard: `DATA` lands inside a `<script>` block — replace `</script` with `<\\/script` in the JSON string before embedding (`JSON.stringify(estimation).replaceAll('</script', '<\\/script')`).

Write the full template: flesh out the skeleton with real CSS (grid layout, card/bar/table styles for both themes, `@media print` hiding controls) and the empty section containers. Page *behavior* is Task 8; the template ships with the sections and controls markup shown above plus a boot line that only parses the data and stamps the title/confidence badge, so this task's page renders statically without errors.

- [ ] **Step 4: Run tests + gates to verify green, then eyeball it**

Run: `node --test plugins/solution-architect/skills/estimate/scripts/test/`
Expected: PASS. Then render the fixture and open it once:

```bash
node plugins/solution-architect/skills/estimate/scripts/compute.mjs \
  --inputs plugins/solution-architect/skills/estimate/scripts/test/fixtures/booking-inputs.json \
  --out /tmp/est/estimation.json
node plugins/solution-architect/skills/estimate/scripts/render.mjs --json /tmp/est/estimation.json --out /tmp/est
node plugins/solution-architect/skills/arch-docs/scripts/serve.mjs /tmp/est
```

- [ ] **Step 5: Commit**

```bash
git add plugins/solution-architect/skills/estimate
git commit -m "feat(estimate): what-if page template and renderer"
```

---

### Task 8: What-if page behavior + browser tests

**Files:**
- Modify: `EST/assets/estimate-template.html` (the page `<script>` block)
- Test: `EST/scripts/test/browser.test.mjs`

**Interfaces:**
- Consumes: inlined math functions (`pert`, `aiAdjust`, `scenarioRollup`, `effectiveCapacity`, `riskBufferHours`, `projectBuffer`, constants) — global in page scope after inlining.
- Produces: `window.__recompute(params)` → `{ months, totalCost, hours }` where `params = { engineers, seniority, plan, rate, aiScale, bufferScale, overheadPct }`. This is both the page's own recompute path and the parity hook the tests call.

Page code contract (all inside the template's script block, after the MATH slot):

```js
const DATA = JSON.parse(document.getElementById('estimation-data').textContent);

function recompute(p) {
  const tasks = DATA.inputs.features.flatMap((f) => f.tasks);
  const hoursOf = (t) => p.plan === 'none' ? pert(t).e
    : aiAdjust({ e: pert(t).e, category: t.category, seniority: p.seniority,
                 verificationPct: DATA.inputs.verificationPct, scale: p.aiScale });
  const dev = tasks.reduce((s, t) => s + hoursOf(t), 0);
  const buffers = (riskBufferHours(DATA.inputs.risks)
    + projectBuffer(tasks.map((t) => pert(t).sigma))) * p.bufferScale;
  const hours = dev + dev * p.overheadPct + buffers;
  const team = Array.from({ length: p.engineers }, () => ({ seniority: p.seniority, rate: p.rate }));
  return { hours, ...scenarioRollup({ hours, team, plan: p.plan }) };
}
window.__recompute = recompute;
```

Plus: `defaultsFromRecommended()` (seed controls from `DATA.inputs.scenarios` recommended entry), `renderCards()`, `renderBars()`, `renderTimeline()`, `renderTable()`, `renderRegister()`, control listeners calling `recompute` + re-render + un-hiding `#modified-banner`, `#reset` restoring defaults, `#view-toggle` toggling `view-client` on `<body>`, `#theme-toggle` flipping `data-theme` on `<html>`. Bars/timeline widths are `style="width: N%"` computed against the max value in view. Confidence dots: a `conf-high|conf-med|conf-low` class per row and on the badge.

- [ ] **Step 1: Write the failing browser tests**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { findChrome } from '../../../arch-docs/scripts/lib/chrome.mjs';
import { openPage } from '../../../arch-docs/scripts/lib/cdp.mjs';
import { pert, aiAdjust, scenarioRollup, riskBufferHours, projectBuffer } from '../lib/estimate-math.mjs';

const skip = { skip: !findChrome() && 'no chrome on PATH' };
const fixture = new URL('./fixtures/booking-inputs.json', import.meta.url).pathname;

function buildPage() {
  const dir = mkdtempSync(join(tmpdir(), 'estimate-browser-'));
  const scripts = new URL('..', import.meta.url).pathname;
  execFileSync('node', [join(scripts, 'compute.mjs'), '--inputs', fixture, '--out', join(dir, 'estimation.json')]);
  execFileSync('node', [join(scripts, 'render.mjs'), '--json', join(dir, 'estimation.json'), '--out', dir]);
  return pathToFileURL(join(dir, 'estimate.html')).href;
}

function nodeRecompute(p) {
  const inputs = JSON.parse(readFileSync(fixture, 'utf8'));
  const tasks = inputs.features.flatMap((f) => f.tasks);
  const hoursOf = (t) => p.plan === 'none' ? pert(t).e
    : aiAdjust({ e: pert(t).e, category: t.category, seniority: p.seniority,
                 verificationPct: inputs.verificationPct, scale: p.aiScale });
  const dev = tasks.reduce((s, t) => s + hoursOf(t), 0);
  const buffers = (riskBufferHours(inputs.risks) + projectBuffer(tasks.map((t) => pert(t).sigma))) * p.bufferScale;
  const hours = dev + dev * p.overheadPct + buffers;
  const team = Array.from({ length: p.engineers }, () => ({ seniority: p.seniority, rate: p.rate }));
  return { hours, ...scenarioRollup({ hours, team, plan: p.plan }) };
}

const PARAMS = { engineers: 2, seniority: 'mid', plan: 'max5x', rate: 45, aiScale: 1, bufferScale: 1, overheadPct: 0.35 };

test('page boots without console errors and browser math equals node math', skip, async () => {
  const page = await openPage(buildPage());
  try {
    const got = await page.eval(`window.__recompute(${JSON.stringify(PARAMS)})`);
    const want = nodeRecompute(PARAMS);
    for (const key of ['hours', 'months', 'totalCost']) {
      assert.ok(Math.abs(got[key] - want[key]) < 1e-6, `${key}: ${got[key]} != ${want[key]}`);
    }
    assert.deepEqual(page.errors, []);
  } finally { page.close(); }
});

test('moving a control updates the custom card and shows the banner', skip, async () => {
  const page = await openPage(buildPage());
  try {
    await page.eval(`(() => {
      const ctl = document.getElementById('ctl-engineers');
      ctl.value = '4'; ctl.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
    assert.equal(await page.eval(`document.getElementById('modified-banner').hidden`), false);
    await page.eval(`document.getElementById('reset').click()`);
    assert.equal(await page.eval(`document.getElementById('modified-banner').hidden`), true);
  } finally { page.close(); }
});

test('client view hides internals; theme toggle flips the root attribute', skip, async () => {
  const page = await openPage(buildPage());
  try {
    await page.eval(`document.getElementById('view-toggle').click()`);
    assert.equal(await page.eval(
      `getComputedStyle(document.getElementById('controls')).display`), 'none');
    await page.eval(`document.getElementById('theme-toggle').click()`);
    assert.equal(await page.eval(`document.documentElement.dataset.theme`), 'dark');
  } finally { page.close(); }
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test plugins/solution-architect/skills/estimate/scripts/test/browser.test.mjs`
Expected: FAIL (page has no `__recompute`, no listeners). If the machine has no Chrome, tests self-skip — then this task's gate is a machine that has one; do not mark the task complete on a skipped run.

- [ ] **Step 3: Implement the page script per the contract above; run to verify green**

Run: `node --test plugins/solution-architect/skills/estimate/scripts/test/`
Expected: PASS, `page.errors` empty.

- [ ] **Step 4: Commit**

```bash
git add plugins/solution-architect/skills/estimate
git commit -m "feat(estimate): live what-if controls with parity-tested math"
```

---

### Task 9: Reference docs

**Files:**
- Create: `EST/references/interview.md`
- Create: `EST/references/techniques.md`
- Create: `EST/references/ai-multipliers.md`
- Create: `EST/references/writing.md`

No test cycle — content deliverables. Each file's required content is specified here; write it in the register and density of `ARCH/references/interview.md` (terse, imperative, agent-directed). Verification = the checklist in Step 5.

- [ ] **Step 1: Write `interview.md`**

Must contain, in order:
1. **Evidence detection table** — the four sources (requirements/RFP/backlog · ARCHITECTURE.md · codebase · none), what each pre-fills, and the provenance label each pre-fill carries (`stated` for documents, `observed` for code scans). Instruction: show the pre-filled scope table with provenance *before* asking anything; ask only holes.
2. **Depth question** — QUICK (feature-level factor-scored tiering, ±wide) / STANDARD (task-level three-point) / DEEP (adds per-scenario detail); ask first, it sizes everything after.
3. **Clear-vs-assumed gate** — present two lists ("confirmed scope" / "assumptions I'm making"), each assumption with impact-if-wrong; user corrects before any sizing. Assumptions transfer verbatim into the deliverable.
4. **Question sequence** (one at a time): scope confirm → factor scores per feature (the five factors: tech complexity, feature size, dependencies, uncertainty, risk, 1-5 each) → team options + rates + seniority mix → Claude plan availability → deadline/constraints → calibration table (tier → hour band; offer the defaults `S 20-60h, M 60-160h, L 160-400h` when the user has no history) → expose-rates-to-client y/n.
5. **Loop rule** — when sizing exposes a scope hole, return to the gate, do not silently add scope.

- [ ] **Step 2: Write `techniques.md`**

Must contain: the four-row technique decision table from the spec (evidence quality → technique → precision) exactly as approved; a named section per technique — **factor-scored tiering** (the five factors, tier breaks ≤10 S / 11-17 M / ≥18 L, calibration table semantics), **three-point PERT** (O/M/P elicitation guidance: O = everything goes right, P = named risks land, never "worst imaginable"), **analogy cross-check** (compare against a past delivered item; flag >30% divergence from the primary method and reconcile before writing) — and the instruction that the skill states its recommended technique and the reason, then lets the user confirm or override.

- [ ] **Step 3: Write `ai-multipliers.md`**

Must contain: the category table (`boilerplate` 50-80% · `logic` 20-40% · `novel` 0-10%) with 4-6 concrete task examples per category; the formula line `(AO + 2×AR + TR) / 4` and where it runs (estimate-math.mjs — this doc explains, the code computes); seniority scaling values matching `SENIORITY_FACTOR`; verification overhead default 12% and why AI output costs review; the **blanket-multiplier prohibition** stated as a hard rule with Kmino's rationale (a project that is 70% faster on CRUD is not 70% faster overall); a dated pricing table:

```markdown
## Claude Code plan pricing (checked 2026-08, update on renewal)

| Plan | USD/seat/month | Constant |
| --- | --- | --- |
| none | 0 | PLAN_PRICES.none |
| Max 5x | 100 | PLAN_PRICES.max5x |
| Max 20x | 200 | PLAN_PRICES.max20x |

Prices are a manually maintained snapshot. When they change, update BOTH this
table and PLAN_PRICES in scripts/lib/estimate-math.mjs in the same commit.
```

- [ ] **Step 4: Write `writing.md`**

Must contain: the `estimation-inputs.json` shape (point at the booking fixture as the canonical example rather than duplicating it); the estimation.md two-part structure with a skeleton matching `estimation-pass.md`; the contract rules list exactly mirroring `checks.mjs` (structure, rows, numbers) so the agent writes to the same rules the validator enforces; file placement (companion mode: beside ARCHITECTURE.md, flip the `electedDocs` estimation entry to `elected: true`; standalone: `docs/estimate/`); the command sequence compute → write md → validate → render → serve with exact CLI lines; the rule that the agent never writes a number into estimation.md that is not present in estimation.json.

- [ ] **Step 5: Review checklist, then commit**

Check each file: no TBD/TODO; every rule stated in `checks.mjs` appears in writing.md; factor names and tier breaks identical across techniques.md, schema.mjs, and estimate-math.mjs; category names identical across ai-multipliers.md and `AI_CATEGORIES`; pricing table matches `PLAN_PRICES`.

```bash
git add plugins/solution-architect/skills/estimate/references
git commit -m "docs(estimate): interview, techniques, AI multipliers, writing contracts"
```

---

### Task 10: SKILL.md, plugin wiring, end-to-end smoke

**Files:**
- Create: `EST/SKILL.md`
- Create: `EST/README.md`
- Modify: `README.md` (repo root — mention the estimate skill)
- Test: `EST/scripts/test/e2e.test.mjs`

**Interfaces:**
- Consumes: everything. This task proves the assembled pipeline.

- [ ] **Step 1: Write the failing e2e test**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from '../../../arch-docs/scripts/serve.mjs';
import { findFreePort } from '../../../arch-docs/scripts/lib/port.mjs';

const scripts = new URL('..', import.meta.url).pathname;
const fixture = join(scripts, 'test/fixtures/booking-inputs.json');
const passMd = join(scripts, 'test/fixtures/estimation-pass.md');

test('fixture flows compute → validate → render → serve', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'estimate-e2e-'));
  const json = join(dir, 'estimation.json');
  execFileSync('node', [join(scripts, 'compute.mjs'), '--inputs', fixture, '--out', json]);
  execFileSync('node', [join(scripts, 'validate.mjs'), '--md', passMd, '--json', json]); // exit 0 or throws
  execFileSync('node', [join(scripts, 'render.mjs'), '--json', json, '--out', dir]);
  const srv = await createServer({ dir, port: await findFreePort(4173) });
  try {
    const res = await fetch(`http://127.0.0.1:${srv.port}/estimate.html`);
    assert.equal(res.status, 200);
    assert.match(await res.text(), /Booking App/);
  } finally { srv.close(); }
});
```

- [ ] **Step 2: Run to verify it fails only if something is broken**

Run: `node --test plugins/solution-architect/skills/estimate/scripts/test/e2e.test.mjs`
Expected: PASS if Tasks 3-8 are sound — this test exists as the standing regression for the assembled pipeline. If it fails, fix before proceeding.

- [ ] **Step 3: Write `SKILL.md`**

Frontmatter + body:

```markdown
---
name: estimate
description: Interview-driven project estimation with AI-aware delivery scenarios. Use when the user asks for an estimate, effort sizing, a quote, a proposal, a timeline, staffing, or "how long would this take" — with or without existing architecture docs.
---

# estimate

Produce an honest, validated estimate: confirmed scope split from assumptions,
a technique that fits the evidence, AI-assisted staffing scenarios, and an
interactive what-if page served on localhost.

## Hard rules

1. Every estimate row carries confidence + assumptions. A row nobody estimated
   renders `not estimated` — never `0`.
2. Every scope item is labeled `stated` or `proposed` — no unlabeled scope.
3. Agent judges, script computes: every number in a deliverable comes from
   `scripts/compute.mjs`. Never total, average, or price by hand.
4. Never apply one blanket AI multiplier to a whole project — per-task
   category only (`references/ai-multipliers.md`).
5. `node scripts/validate.mjs` must exit 0 before the page renders.

## Flow

1. **Detect evidence**: requirements/RFP? ARCHITECTURE.md? codebase? none?
   State findings; the user can override. (`references/interview.md` §1)
2. **Depth**: ask QUICK / STANDARD / DEEP first.
3. **Interview**: follow `references/interview.md` — pre-fill from evidence,
   ask only holes, run the clear-vs-assumed gate before sizing.
4. **Technique**: recommend from `references/techniques.md`, state why, confirm.
5. **Size**: write judgments to `estimation-inputs.json`
   (`references/writing.md` — the booking fixture is the canonical shape).
6. **Compute**: `node scripts/compute.mjs --inputs estimation-inputs.json --out estimation.json`
7. **Write**: estimation.md per `references/writing.md`.
8. **Validate**: `node scripts/validate.mjs --md estimation.md --json estimation.json`
   — fix findings, re-run until clean.
9. **Render + serve**:
   `node scripts/render.mjs --json estimation.json --out <dir>` (add
   `--client-only` for a client-safe file), then serve with the arch-docs
   skill's `serve.mjs`; report the URL.

## Companion mode

When ARCHITECTURE.md exists: §6 components seed the WBS, §15 risks seed the
risk register, flip the `electedDocs` estimation entry to `elected: true`,
place estimation.md beside ARCHITECTURE.md so the arch-docs viewer picks it
up as a companion page; link the interactive page from it.

## Dependency

Node ≥ 20. No npm install needed — the scripts are dependency-free.
```

- [ ] **Step 4: Write `EST/README.md` and update the root README**

`EST/README.md`: short human-facing overview (what it produces, the two run modes, one screenshot-less usage example with the CLI lines). Root `README.md`: under the plugin section, add the estimate skill one-liner and `-p solution-architect` already covers install.

- [ ] **Step 5: Full suite, then commit**

Run: `npm test && node --test plugins/solution-architect/skills/arch-docs/scripts/test/ && node --test plugins/solution-architect/skills/estimate/scripts/test/`
Expected: all PASS.

```bash
git add plugins/solution-architect/skills/estimate README.md
git commit -m "feat(estimate): skill instructions and end-to-end smoke"
```

---

## Self-review notes

- Spec coverage: rename (T1), interview/references (T9), technique selection (T9), math incl. AI formula + scenarios (T3, T5), clear-vs-assumed (T9 §3 + schema provenance labels T4), contracts + honesty rules (T6), interactive page with parity guarantee (T7, T8), companion mode + serving (T10 SKILL.md), non-goals excluded throughout.
- Known judgment calls an implementer may revisit with the user: `HOURS_PER_MONTH = 140`, `COORDINATION_TAX = 0.10`, seniority factors, 12% verification default — all constants in one file (`estimate-math.mjs`), documented in `ai-multipliers.md`.
- Golden numbers were hand-computed (pert values, devHours 90.67, spread buffer 10.91, scenario 4.0mo/$51,200); if an implementation disagrees, re-derive by hand before touching the test — the test is the spec here.
