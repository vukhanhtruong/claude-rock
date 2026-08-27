# Business Analyst Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A new `business-analyst` plugin whose single skill turns raw client input into a validated, traceable requirements package (requirements.md + requirements.json), optionally chained as step 0 of new-lead.

**Architecture:** One plugin, one skill. SKILL.md (hard rules + flow) delegates to five reference docs; a dependency-free `scripts/validate.mjs` gates the package (schema, ID integrity, label discipline, ambiguity lint, readiness math, md↔json sync). new-lead soft-detects the skill; downstream skills detect only the artifact.

**Tech Stack:** Plain Node ≥ 20 ESM (`.mjs`), `node --test`, no npm dependencies. Markdown skill docs.

**Spec:** `docs/superpowers/specs/2026-08-27-business-analyst-skill-design.md`

## Global Constraints

- Scripts are dependency-free Node ≥ 20 ESM; no npm installs.
- Root `npm test` glob (`plugins/*/skills/*/scripts/test/*.test.mjs`) picks the new tests up automatically — do not edit package.json.
- Commit messages: Conventional Commits, imperative, lowercase subject ≤ 50 chars. **Never add any AI attribution trailer** (`Co-Authored-By: Claude`, `🤖 Generated with…`) — user rules forbid it and override any harness default.
- The skill must never recommend technology or architecture — it stops at WHAT (spec: hard rule 2).
- Status enum everywhere: `DRAFT → CLARIFICATION_REQUIRED → ANALYZED → VALIDATED → READY_FOR_ARCHITECTURE`.
- ID formats: `G-`, `ACT-`, `WF-`, `FR-`, `BR-`, `SC-`, `NFR-`, `INT-`, `DAT-`, `CON-`, `ASM-`, `Q-`, `CONFLICT-` each followed by exactly 3 digits.
- The ambiguous-terms list in `references/writing.md` must stay identical to `AMBIGUOUS` in `lib/checks.mjs`.

---

### Task 1: Plugin scaffold + marketplace entry

**Files:**
- Create: `plugins/business-analyst/.claude-plugin/plugin.json`
- Modify: `.claude-plugin/marketplace.json` (add one entry to `plugins` array)

**Interfaces:**
- Produces: the plugin directory every later task writes into.

- [ ] **Step 1: Write plugin.json**

```json
{
  "name": "business-analyst",
  "version": "0.1.0",
  "description": "Business-analysis toolkit: interview-driven requirements discovery that turns raw client input into a validated, traceable requirements package ready for solution architecture.",
  "author": {
    "name": "Truong Vu",
    "email": "vukhanhtruong@gmail.com"
  }
}
```

- [ ] **Step 2: Add marketplace entry**

In `.claude-plugin/marketplace.json`, append to the `plugins` array (after the `lmk` entry):

```json
{
  "name": "business-analyst",
  "source": "./plugins/business-analyst",
  "description": "Business-analysis toolkit: interview-driven requirements discovery that turns raw client input into a validated, traceable requirements package ready for solution architecture.",
  "version": "0.1.0",
  "author": {
    "name": "Truong Vu",
    "email": "vukhanhtruong@gmail.com"
  },
  "keywords": ["business-analysis", "requirements", "discovery", "elicitation", "pre-sales"],
  "category": "documentation",
  "strict": false
}
```

- [ ] **Step 3: Verify both files parse**

Run: `node -e "JSON.parse(require('fs').readFileSync('.claude-plugin/marketplace.json','utf8')); JSON.parse(require('fs').readFileSync('plugins/business-analyst/.claude-plugin/plugin.json','utf8')); console.log('ok')"`
Expected: `ok`

Note: the npx installer ships everything under `plugins/` (package.json `files`), so no installer change is needed.

- [ ] **Step 4: Commit**

```bash
git add plugins/business-analyst .claude-plugin/marketplace.json
git commit -m "feat(business-analyst): scaffold plugin and marketplace entry"
```

---

### Task 2: Schema checks (`lib/schema.mjs`) + pass fixture (json)

**Files:**
- Create: `plugins/business-analyst/skills/business-analyst/scripts/lib/schema.mjs`
- Create: `plugins/business-analyst/skills/business-analyst/scripts/test/fixtures/requirements-pass.json`
- Test: `plugins/business-analyst/skills/business-analyst/scripts/test/schema.test.mjs`

**Interfaces:**
- Produces: `checkSchema(pkg) -> string[]` (findings; empty = clean), plus exported constants `STATUSES`, `DEPTHS`, `MODES`, `LABELS`, `PRIORITIES`, `FR_SCOPES`, `AREAS`, `REGISTERS` (array of `[registerName, idRegExp]`). Tasks 3–5 import these.
- Produces: the canonical pass fixture used by every later test.

- [ ] **Step 1: Write the pass fixture** `scripts/test/fixtures/requirements-pass.json`

This is also the canonical schema example `references/writing.md` will point to. Readiness overall is the rounded mean of areas: (90+80+70+60+70+70)/6 = 73.33 → 73.

```json
{
  "schemaVersion": "1.0",
  "lead": "acme-crm",
  "status": "CLARIFICATION_REQUIRED",
  "depth": "STANDARD",
  "updated": "2026-08-27",
  "mode": "existing",
  "context": {
    "problem": "Invoice approval is manual; finance spends 3 days per cycle chasing approvers.",
    "goals": [
      { "id": "G-001", "goal": "Cut invoice approval cycle time", "metric": "median cycle < 1 day", "source": "kickoff call 2026-08-20" }
    ],
    "successMetrics": ["median approval cycle time under 1 day within 3 months"]
  },
  "actors": [
    { "id": "ACT-001", "name": "Finance Officer", "type": "human", "goal": "process invoices without chasing approvers", "painPoints": ["chasing approvers by email"] },
    { "id": "ACT-002", "name": "Manager", "type": "human", "goal": "approve high-value invoices", "painPoints": ["no visibility of the pending queue"] }
  ],
  "workflows": [
    { "id": "WF-001", "name": "Invoice approval", "state": "as-is", "trigger": "invoice received by email", "steps": ["finance officer logs invoice", "emails manager for approval", "manager replies", "officer pays"], "exceptions": ["manager on leave: invoice waits"] }
  ],
  "requirements": [
    { "id": "FR-001", "text": "The system must route invoices above the approval threshold to a manager for approval.", "label": "confirmed", "source": "kickoff call 2026-08-20", "traces": { "goal": "G-001", "workflow": "WF-001", "rules": ["BR-001"] }, "scope": "in", "acceptance": ["SC-001", "SC-002"] },
    { "id": "FR-002", "text": "The system must record an audit trail of every approval decision.", "label": "assumed", "source": "compliance mention in meeting notes 2026-08-21", "traces": { "goal": "G-001", "workflow": "WF-001", "rules": [] }, "scope": "in", "acceptance": [] }
  ],
  "businessRules": [
    { "id": "BR-001", "rule": "Invoices above $10,000 require manager approval.", "source": "kickoff call 2026-08-20", "examples": ["$8,000 -> no approval", "$15,000 -> approval required"], "openQuestion": "Q-001" }
  ],
  "scenarios": [
    { "id": "SC-001", "requirement": "FR-001", "type": "happy", "given": "an invoice of $15,000", "when": "the invoice is submitted", "then": "manager approval is requested" },
    { "id": "SC-002", "requirement": "FR-001", "type": "edge", "given": "an invoice of exactly $10,000", "when": "the invoice is submitted", "then": "no approval is requested" }
  ],
  "nfrs": [
    { "id": "NFR-001", "area": "auditability", "text": "Approval decisions must be retained for 7 years.", "label": "assumed" }
  ],
  "integrations": [
    { "id": "INT-001", "system": "Xero", "direction": "read", "label": "confirmed" }
  ],
  "data": [
    { "id": "DAT-001", "entity": "Invoice", "sensitivity": "financial", "volume": "about 400 per month", "label": "confirmed" }
  ],
  "constraints": [
    { "id": "CON-001", "text": "Must run inside the client's existing Microsoft 365 tenant.", "source": "client IT policy document" }
  ],
  "assumptions": [
    { "id": "ASM-001", "text": "Managers authenticate through Microsoft Entra.", "impact": "high", "status": "unconfirmed" }
  ],
  "openQuestions": [
    { "id": "Q-001", "question": "Is the $10,000 threshold in local currency or USD equivalent?", "priority": "P1", "reason": "changes the approval rule for multi-currency invoices", "affects": ["BR-001", "FR-001"], "status": "open", "answer": null, "architectureBlocker": true }
  ],
  "conflicts": [],
  "scope": { "out": ["payment execution"], "future": ["mobile approvals"], "unconfirmed": ["multi-entity support"] },
  "ai": null,
  "readiness": {
    "overall": 73,
    "areas": { "businessContext": 90, "workflows": 80, "rules": 70, "integrations": 60, "data": 70, "nfrs": 70 },
    "blockers": ["Q-001", "ASM-001"]
  }
}
```

- [ ] **Step 2: Write the failing tests** `scripts/test/schema.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkSchema } from '../lib/schema.mjs';

const load = () =>
  JSON.parse(readFileSync(new URL('./fixtures/requirements-pass.json', import.meta.url), 'utf8'));

test('the pass fixture has no schema findings', () => {
  assert.deepEqual(checkSchema(load()), []);
});

test('a missing top-level field is named', () => {
  const pkg = load();
  delete pkg.readiness;
  assert.ok(checkSchema(pkg).some((f) => f.includes('readiness')));
});

test('an illegal status is refused', () => {
  const pkg = load();
  pkg.status = 'FINISHED';
  assert.ok(checkSchema(pkg).some((f) => f.includes('illegal status')));
});

test('a bad id format is refused', () => {
  const pkg = load();
  pkg.requirements[0].id = 'REQ-1';
  assert.ok(checkSchema(pkg).some((f) => f.includes('bad id REQ-1')));
});

test('a bad goal id format is refused', () => {
  const pkg = load();
  pkg.context.goals[0].id = 'GOAL-1';
  assert.ok(checkSchema(pkg).some((f) => f.includes('bad id GOAL-1')));
});

test('an illegal row enum is refused', () => {
  const pkg = load();
  pkg.requirements[0].label = 'definite';
  assert.ok(checkSchema(pkg).some((f) => f.includes('illegal label')));
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `node --test plugins/business-analyst/skills/business-analyst/scripts/test/schema.test.mjs`
Expected: FAIL — cannot find module `../lib/schema.mjs`

- [ ] **Step 4: Write** `scripts/lib/schema.mjs`

```js
export const STATUSES = ['DRAFT', 'CLARIFICATION_REQUIRED', 'ANALYZED', 'VALIDATED', 'READY_FOR_ARCHITECTURE'];
export const DEPTHS = ['QUICK', 'STANDARD', 'DEEP'];
export const MODES = ['greenfield', 'existing'];
export const LABELS = ['confirmed', 'assumed', 'recommended'];
export const PRIORITIES = ['P1', 'P2', 'P3'];
export const FR_SCOPES = ['in', 'out', 'future', 'unconfirmed'];
export const AREAS = ['businessContext', 'workflows', 'rules', 'integrations', 'data', 'nfrs'];

export const REGISTERS = [
  ['actors', /^ACT-\d{3}$/],
  ['workflows', /^WF-\d{3}$/],
  ['requirements', /^FR-\d{3}$/],
  ['businessRules', /^BR-\d{3}$/],
  ['scenarios', /^SC-\d{3}$/],
  ['nfrs', /^NFR-\d{3}$/],
  ['integrations', /^INT-\d{3}$/],
  ['data', /^DAT-\d{3}$/],
  ['constraints', /^CON-\d{3}$/],
  ['assumptions', /^ASM-\d{3}$/],
  ['openQuestions', /^Q-\d{3}$/],
  ['conflicts', /^CONFLICT-\d{3}$/],
];

const REQUIRED = ['schemaVersion', 'lead', 'status', 'depth', 'updated', 'mode', 'context', 'scope', 'ai', 'readiness'];
const TOP_ENUMS = [['status', STATUSES], ['depth', DEPTHS], ['mode', MODES]];

const ROW_ENUMS = [
  ['requirements', 'label', LABELS],
  ['requirements', 'scope', FR_SCOPES],
  ['nfrs', 'label', LABELS],
  ['integrations', 'label', LABELS],
  ['integrations', 'direction', ['read', 'write', 'both']],
  ['data', 'label', LABELS],
  ['scenarios', 'type', ['happy', 'edge', 'error']],
  ['assumptions', 'impact', ['high', 'medium', 'low']],
  ['assumptions', 'status', ['unconfirmed', 'accepted', 'resolved']],
  ['openQuestions', 'priority', PRIORITIES],
  ['openQuestions', 'status', ['open', 'answered']],
  ['conflicts', 'status', ['open', 'resolved']],
];

function checkTopLevel(pkg) {
  const findings = [];
  for (const f of REQUIRED) if (!(f in pkg)) findings.push(`missing required field: ${f}`);
  for (const [f, legal] of TOP_ENUMS) {
    if (f in pkg && !legal.includes(pkg[f])) findings.push(`illegal ${f}: ${pkg[f]}`);
  }
  return findings;
}

function checkIds(pkg) {
  const findings = [];
  for (const g of pkg.context?.goals ?? []) {
    if (!/^G-\d{3}$/.test(g.id ?? '')) findings.push(`context.goals: bad id ${g.id}`);
  }
  for (const [name, re] of REGISTERS) {
    for (const row of pkg[name] ?? []) {
      if (!re.test(row.id ?? '')) findings.push(`${name}: bad id ${row.id}`);
    }
  }
  return findings;
}

function checkRowEnums(pkg) {
  const findings = [];
  for (const [name, field, legal] of ROW_ENUMS) {
    for (const row of pkg[name] ?? []) {
      if (row[field] !== undefined && !legal.includes(row[field])) {
        findings.push(`${row.id}: illegal ${field} "${row[field]}"`);
      }
    }
  }
  return findings;
}

export function checkSchema(pkg) {
  return [...checkTopLevel(pkg), ...checkIds(pkg), ...checkRowEnums(pkg)];
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `node --test plugins/business-analyst/skills/business-analyst/scripts/test/schema.test.mjs`
Expected: all PASS

- [ ] **Step 6: Commit**

```bash
git add plugins/business-analyst/skills/business-analyst/scripts
git commit -m "feat(business-analyst): schema checks and canonical fixture"
```

---

### Task 3: Cross-reference and label checks (`lib/checks.mjs`, part 1)

**Files:**
- Create: `plugins/business-analyst/skills/business-analyst/scripts/lib/checks.mjs`
- Test: `plugins/business-analyst/skills/business-analyst/scripts/test/checks.test.mjs`

**Interfaces:**
- Consumes: `REGISTERS`, `checkSchema` from `./schema.mjs`.
- Produces: `collectIds(pkg) -> Set<string>`, `checkDuplicates(pkg)`, `checkRefs(pkg, ids)`, `checkLabels(pkg)` — each `-> string[]`. Task 5 wires them into `checkPackage`.

- [ ] **Step 1: Write the failing tests** — create `scripts/test/checks.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { collectIds, checkDuplicates, checkRefs, checkLabels } from '../lib/checks.mjs';

const load = () =>
  JSON.parse(readFileSync(new URL('./fixtures/requirements-pass.json', import.meta.url), 'utf8'));

test('the pass fixture has no integrity findings', () => {
  const pkg = load();
  const ids = collectIds(pkg);
  assert.deepEqual(
    [...checkDuplicates(pkg), ...checkRefs(pkg, ids), ...checkLabels(pkg)], []);
});

test('a duplicate id is refused', () => {
  const pkg = load();
  pkg.assumptions.push({ ...pkg.assumptions[0] });
  assert.ok(checkDuplicates(pkg).some((f) => f.includes('duplicate id: ASM-001')));
});

test('a dangling trace reference is refused', () => {
  const pkg = load();
  pkg.requirements[0].traces.rules = ['BR-999'];
  assert.ok(checkRefs(pkg, collectIds(pkg)).some((f) => f.includes('FR-001') && f.includes('BR-999')));
});

test('a dangling readiness blocker is refused', () => {
  const pkg = load();
  pkg.readiness.blockers.push('Q-404');
  assert.ok(checkRefs(pkg, collectIds(pkg)).some((f) => f.includes('Q-404')));
});

test('a requirement without a label is refused', () => {
  const pkg = load();
  delete pkg.requirements[1].label;
  assert.ok(checkLabels(pkg).some((f) => f.includes('FR-002') && f.includes('missing label')));
});

test('a business rule without a source is refused', () => {
  const pkg = load();
  delete pkg.businessRules[0].source;
  assert.ok(checkLabels(pkg).some((f) => f.includes('BR-001') && f.includes('missing source')));
});

test('a recommended requirement in scope "in" needs a paired open question', () => {
  const pkg = load();
  pkg.requirements[1].label = 'recommended';
  assert.ok(checkLabels(pkg).some((f) => f.includes('FR-002') && f.includes('open question')));
});
```

(FR-002 is not listed in any `openQuestions[].affects` in the fixture, so the last test seeds a real violation. FR-001 is listed by Q-001, so making it `recommended` would NOT trip the rule — that's by design.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test plugins/business-analyst/skills/business-analyst/scripts/test/checks.test.mjs`
Expected: FAIL — cannot find module `../lib/checks.mjs`

- [ ] **Step 3: Write** `scripts/lib/checks.mjs`:

```js
import { REGISTERS } from './schema.mjs';

const LABELED = ['requirements', 'nfrs', 'integrations', 'data'];
const SOURCED = ['requirements', 'businessRules', 'constraints'];

export function collectIds(pkg) {
  const ids = new Set((pkg.context?.goals ?? []).map((g) => g.id));
  for (const [name] of REGISTERS) for (const row of pkg[name] ?? []) ids.add(row.id);
  return ids;
}

export function checkDuplicates(pkg) {
  const findings = [];
  const seen = new Set();
  const rows = [...(pkg.context?.goals ?? []), ...REGISTERS.flatMap(([name]) => pkg[name] ?? [])];
  for (const row of rows) {
    if (seen.has(row.id)) findings.push(`duplicate id: ${row.id}`);
    seen.add(row.id);
  }
  return findings;
}

export function checkRefs(pkg, ids) {
  const findings = [];
  const miss = (owner, ref) => findings.push(`${owner}: dangling reference ${ref}`);
  for (const fr of pkg.requirements ?? []) {
    const t = fr.traces ?? {};
    const refs = [t.goal, t.workflow, ...(t.rules ?? []), ...(fr.acceptance ?? [])];
    for (const ref of refs) if (ref && !ids.has(ref)) miss(fr.id, ref);
  }
  for (const br of pkg.businessRules ?? []) {
    if (br.openQuestion && !ids.has(br.openQuestion)) miss(br.id, br.openQuestion);
  }
  for (const sc of pkg.scenarios ?? []) if (!ids.has(sc.requirement)) miss(sc.id, sc.requirement);
  for (const q of pkg.openQuestions ?? []) {
    for (const ref of q.affects ?? []) if (!ids.has(ref)) miss(q.id, ref);
  }
  for (const ref of pkg.readiness?.blockers ?? []) if (!ids.has(ref)) miss('readiness.blockers', ref);
  return findings;
}

function hasOpenQuestionFor(pkg, id) {
  return (pkg.openQuestions ?? []).some((q) => (q.affects ?? []).includes(id));
}

export function checkLabels(pkg) {
  const findings = [];
  for (const name of LABELED) {
    for (const row of pkg[name] ?? []) if (!row.label) findings.push(`${row.id}: missing label`);
  }
  for (const name of SOURCED) {
    for (const row of pkg[name] ?? []) if (!row.source) findings.push(`${row.id}: missing source`);
  }
  for (const fr of pkg.requirements ?? []) {
    if (fr.label === 'recommended' && fr.scope === 'in' && !hasOpenQuestionFor(pkg, fr.id)) {
      findings.push(`${fr.id}: recommended requirement in scope "in" without a paired open question`);
    }
  }
  return findings;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test plugins/business-analyst/skills/business-analyst/scripts/test/checks.test.mjs`
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add plugins/business-analyst/skills/business-analyst/scripts
git commit -m "feat(business-analyst): id integrity and label checks"
```

---

### Task 4: Ambiguity lint + readiness math (`lib/checks.mjs`, part 2)

**Files:**
- Modify: `plugins/business-analyst/skills/business-analyst/scripts/lib/checks.mjs`
- Test: `plugins/business-analyst/skills/business-analyst/scripts/test/checks.test.mjs` (append)

**Interfaces:**
- Consumes: `STATUSES`, `AREAS` from `./schema.mjs`.
- Produces: `AMBIGUOUS` (exported const array), `checkAmbiguity(pkg)`, `checkReadiness(pkg)` — each `-> string[]`.

- [ ] **Step 1: Append failing tests** to `scripts/test/checks.test.mjs`:

```js
import { checkAmbiguity, checkReadiness } from '../lib/checks.mjs'; // merge into the existing import

test('the pass fixture has no ambiguity or readiness findings', () => {
  const pkg = load();
  assert.deepEqual([...checkAmbiguity(pkg), ...checkReadiness(pkg)], []);
});

test('a vague requirement is flagged with its id and the term', () => {
  const pkg = load();
  pkg.requirements[0].text = 'The system must be fast and user-friendly.';
  const findings = checkAmbiguity(pkg);
  assert.ok(findings.some((f) => f.includes('FR-001') && f.includes('"fast"')));
  assert.ok(findings.some((f) => f.includes('FR-001') && f.includes('"user-friendly"')));
});

test('a vague nfr is flagged', () => {
  const pkg = load();
  pkg.nfrs[0].text = 'The system should be robust.';
  assert.ok(checkAmbiguity(pkg).some((f) => f.includes('NFR-001') && f.includes('"robust"')));
});

test('a hand-edited readiness overall is refused', () => {
  const pkg = load();
  pkg.readiness.overall = 95;
  assert.ok(checkReadiness(pkg).some((f) => f.includes('recomputed')));
});

test('a missing area score is refused', () => {
  const pkg = load();
  delete pkg.readiness.areas.data;
  assert.ok(checkReadiness(pkg).some((f) => f.includes('missing area score')));
});

test('status past ANALYZED with an open architecture blocker is refused', () => {
  const pkg = load();
  pkg.status = 'VALIDATED';
  assert.ok(checkReadiness(pkg).some((f) => f.includes('VALIDATED') && f.includes('Q-001')));
});

test('an open architecture blocker missing from readiness.blockers is refused', () => {
  const pkg = load();
  pkg.readiness.blockers = ['ASM-001'];
  assert.ok(checkReadiness(pkg).some((f) => f.includes('blockers missing') && f.includes('Q-001')));
});

test('READY with an unconfirmed high-impact assumption is refused', () => {
  const pkg = load();
  pkg.status = 'READY_FOR_ARCHITECTURE';
  assert.ok(checkReadiness(pkg).some((f) => f.includes('high-impact assumptions') && f.includes('ASM-001')));
});

test('READY with an open conflict is refused', () => {
  const pkg = load();
  pkg.status = 'READY_FOR_ARCHITECTURE';
  pkg.conflicts.push({ id: 'CONFLICT-001', topic: 'approval', statements: ['A: all', 'B: under $1,000 auto'], status: 'open' });
  assert.ok(checkReadiness(pkg).some((f) => f.includes('open conflicts')));
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `node --test plugins/business-analyst/skills/business-analyst/scripts/test/checks.test.mjs`
Expected: FAIL — `checkAmbiguity` is not exported

- [ ] **Step 3: Append to** `scripts/lib/checks.mjs` (and extend the schema import to `import { REGISTERS, STATUSES, AREAS } from './schema.mjs';`):

```js
export const AMBIGUOUS = [
  'fast', 'quick', 'easy', 'simple', 'user-friendly', 'intuitive', 'flexible',
  'robust', 'seamless', 'efficient', 'optimal', 'appropriate', 'various',
  'etc', 'some', 'many', 'several', 'as needed',
];

export function checkAmbiguity(pkg) {
  const findings = [];
  for (const row of [...(pkg.requirements ?? []), ...(pkg.nfrs ?? [])]) {
    for (const word of AMBIGUOUS) {
      const re = new RegExp(`\\b${word.replace(/[-\s]/g, '[-\\s]')}\\b`, 'i');
      if (re.test(row.text ?? '')) {
        findings.push(`${row.id}: ambiguous term "${word}" — replace with a measurable statement`);
      }
    }
  }
  return findings;
}

export function checkReadiness(pkg) {
  const findings = [];
  const r = pkg.readiness ?? {};
  const values = AREAS.map((a) => r.areas?.[a]).filter((v) => typeof v === 'number');
  if (values.length !== AREAS.length) findings.push('readiness.areas: missing area score');
  const mean = Math.round(values.reduce((s, v) => s + v, 0) / (values.length || 1));
  if (r.overall !== mean) findings.push(`readiness.overall ${r.overall} != recomputed mean ${mean}`);
  const openBlockers = (pkg.openQuestions ?? []).filter((q) => q.status === 'open' && q.architectureBlocker);
  if (openBlockers.length && STATUSES.indexOf(pkg.status) > STATUSES.indexOf('ANALYZED')) {
    findings.push(`status ${pkg.status} with open architecture blockers: ${openBlockers.map((q) => q.id).join(', ')}`);
  }
  for (const q of openBlockers) {
    if (!(r.blockers ?? []).includes(q.id)) findings.push(`readiness.blockers missing ${q.id}`);
  }
  const risky = (pkg.assumptions ?? []).filter((a) => a.impact === 'high' && a.status === 'unconfirmed');
  if (pkg.status === 'READY_FOR_ARCHITECTURE' && risky.length) {
    findings.push(`READY_FOR_ARCHITECTURE with unconfirmed high-impact assumptions: ${risky.map((a) => a.id).join(', ')}`);
  }
  if (pkg.status === 'READY_FOR_ARCHITECTURE' && (pkg.conflicts ?? []).some((c) => c.status === 'open')) {
    findings.push('READY_FOR_ARCHITECTURE with open conflicts');
  }
  return findings;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test plugins/business-analyst/skills/business-analyst/scripts/test/checks.test.mjs`
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add plugins/business-analyst/skills/business-analyst/scripts
git commit -m "feat(business-analyst): ambiguity lint and readiness math"
```

---

### Task 5: md checks + orchestrator + pass fixture (md)

**Files:**
- Modify: `plugins/business-analyst/skills/business-analyst/scripts/lib/checks.mjs`
- Create: `plugins/business-analyst/skills/business-analyst/scripts/test/fixtures/requirements-pass.md`
- Test: `plugins/business-analyst/skills/business-analyst/scripts/test/checks.test.mjs` (append)

**Interfaces:**
- Produces: `checkMd(pkg, md)`, `checkMdOrphanIds(pkg, md, ids)` and the orchestrator `checkPackage({ pkg, md }) -> string[]` — the single entry point Task 6's CLI calls.

- [ ] **Step 1: Write the md pass fixture** `scripts/test/fixtures/requirements-pass.md`

Must mention every id in the json fixture; frontmatter must match json `status` and `readiness.overall`.

```markdown
---
lead: acme-crm
status: CLARIFICATION_REQUIRED
depth: STANDARD
updated: 2026-08-27
readiness: 73
---

# Requirements — Acme CRM invoice approval

## Part 1 — Discovery Brief

Problem: invoice approval is manual; finance spends 3 days per cycle chasing approvers.

| ID | Goal | Metric |
| --- | --- | --- |
| G-001 | Cut invoice approval cycle time | median cycle < 1 day |

Benefit hypothesis: we believe automated approval routing (FR-001) will cut cycle
time, measured by a median approval cycle under 1 day within 3 months.

Constraints: CON-001 — must run inside the client's existing Microsoft 365 tenant.

## Part 2 — Process & Domain

As-is workflow WF-001 (invoice approval): invoice received by email → finance
officer (ACT-001) logs the invoice → emails the manager (ACT-002) for approval →
manager replies → officer pays. Exception: manager on leave — the invoice waits.

| ID | Rule | Examples |
| --- | --- | --- |
| BR-001 | Invoices above $10,000 require manager approval | $8,000 → no approval; $15,000 → approval required |

## Part 3 — Requirements

Scope — out: payment execution. Future: mobile approvals. Unconfirmed: multi-entity support.

| ID | Requirement | Label | Scope |
| --- | --- | --- | --- |
| FR-001 | Route invoices above the approval threshold to a manager | confirmed | in |
| FR-002 | Record an audit trail of every approval decision | assumed | in |

NFR-001 (auditability, assumed): approval decisions retained for 7 years.
INT-001: read invoices from Xero (confirmed).
DAT-001: Invoice — financial sensitivity, about 400 per month (confirmed).

## Part 4 — Acceptance Scenarios

| ID | Given | When | Then |
| --- | --- | --- | --- |
| SC-001 | an invoice of $15,000 | the invoice is submitted | manager approval is requested |
| SC-002 | an invoice of exactly $10,000 | the invoice is submitted | no approval is requested |

## Part 5 — Readiness Report

Readiness: 73%. Areas — businessContext 90, workflows 80, rules 70,
integrations 60, data 70, nfrs 70.

Open questions: Q-001 (P1, architecture blocker) — is the $10,000 threshold in
local currency or USD equivalent?
Assumptions: ASM-001 (high impact, unconfirmed) — managers authenticate through
Microsoft Entra.
Blockers: Q-001, ASM-001. Conflicts: none.
```

- [ ] **Step 2: Append failing tests** to `scripts/test/checks.test.mjs`:

```js
import { checkPackage } from '../lib/checks.mjs'; // merge into the existing import

const loadMd = () =>
  readFileSync(new URL('./fixtures/requirements-pass.md', import.meta.url), 'utf8');

test('the pass pair passes checkPackage end to end', () => {
  assert.deepEqual(checkPackage({ pkg: load(), md: loadMd() }), []);
});

test('schema findings short-circuit the deeper checks', () => {
  const pkg = load();
  delete pkg.readiness;
  const findings = checkPackage({ pkg, md: loadMd() });
  assert.ok(findings.some((f) => f.includes('readiness')));
  assert.ok(!findings.some((f) => f.includes('recomputed')));
});

test('a placeholder in the md is refused', () => {
  const findings = checkPackage({ pkg: load(), md: loadMd() + '\nTBD\n' });
  assert.ok(findings.some((f) => f.includes('placeholder')));
});

test('a missing required section is refused', () => {
  const md = loadMd().replace('## Part 4 — Acceptance Scenarios', '## Acceptance');
  assert.ok(checkPackage({ pkg: load(), md }).some((f) => f.includes('Part 4')));
});

test('QUICK depth requires only parts 1, 3 and 5', () => {
  const pkg = load();
  pkg.depth = 'QUICK';
  const md = loadMd()
    .replace(/## Part 2[\s\S]*?(?=## Part 3)/, '')
    .replace(/## Part 4[\s\S]*?(?=## Part 5)/, '')
    .replace('depth: STANDARD', 'depth: QUICK');
  const findings = checkPackage({ pkg, md });
  assert.ok(!findings.some((f) => f.includes('Part 2') || f.includes('Part 4')));
});

test('a json id absent from the md is refused', () => {
  const md = loadMd().replaceAll('ASM-001', 'ASM-0O1');
  assert.ok(checkPackage({ pkg: load(), md }).some((f) => f.includes('ASM-001') && f.includes('absent')));
});

test('an unknown id in the md is refused', () => {
  const md = loadMd() + '\nSee FR-042 for details.\n';
  assert.ok(checkPackage({ pkg: load(), md }).some((f) => f.includes('unknown id FR-042')));
});

test('a frontmatter status mismatch is refused', () => {
  const md = loadMd().replace('status: CLARIFICATION_REQUIRED', 'status: VALIDATED');
  assert.ok(checkPackage({ pkg: load(), md }).some((f) => f.includes('frontmatter status')));
});
```

- [ ] **Step 3: Run tests to verify the new ones fail**

Run: `node --test plugins/business-analyst/skills/business-analyst/scripts/test/checks.test.mjs`
Expected: FAIL — `checkPackage` is not exported

- [ ] **Step 4: Append to** `scripts/lib/checks.mjs` (extend the schema import with `checkSchema`):

```js
const PARTS = ['Part 1', 'Part 2', 'Part 3', 'Part 4', 'Part 5'];
const QUICK_PARTS = ['Part 1', 'Part 3', 'Part 5'];
const ID_TOKEN = /\b(?:G|ACT|WF|FR|BR|SC|NFR|INT|DAT|CON|ASM|Q|CONFLICT)-\d{3}\b/g;

function sectionBodies(md) {
  const bodies = {};
  for (const chunk of md.split(/^## /m).slice(1)) {
    const nl = chunk.indexOf('\n');
    bodies[chunk.slice(0, nl).trim()] = chunk.slice(nl + 1);
  }
  return bodies;
}

export function checkMd(pkg, md) {
  const findings = [];
  if (/\[TODO\]|\bTBD\b|\bXXX\b/.test(md)) findings.push('md: placeholder found ([TODO]/TBD/XXX)');
  const bodies = sectionBodies(md);
  const required = pkg.depth === 'QUICK' ? QUICK_PARTS : PARTS;
  for (const part of required) {
    const key = Object.keys(bodies).find((h) => h.startsWith(part));
    if (!key) findings.push(`md: missing section "## ${part}"`);
    else if (!bodies[key].trim()) findings.push(`md: empty section "## ${part}"`);
  }
  for (const id of collectIds(pkg)) {
    if (!md.includes(id)) findings.push(`md: id ${id} absent from requirements.md`);
  }
  const fmStatus = md.match(/^status:\s*(\S+)/m)?.[1];
  if (fmStatus !== pkg.status) findings.push(`md frontmatter status ${fmStatus} != json status ${pkg.status}`);
  const fmReadiness = Number(md.match(/^readiness:\s*(\d+)/m)?.[1]);
  if (fmReadiness !== pkg.readiness?.overall) {
    findings.push(`md frontmatter readiness ${fmReadiness} != json readiness.overall ${pkg.readiness?.overall}`);
  }
  return findings;
}

export function checkMdOrphanIds(pkg, md, ids) {
  const findings = [];
  for (const m of md.matchAll(ID_TOKEN)) {
    if (!ids.has(m[0])) findings.push(`md: unknown id ${m[0]}`);
  }
  return findings;
}

export function checkPackage({ pkg, md }) {
  const schemaFindings = checkSchema(pkg);
  if (schemaFindings.length) return schemaFindings;
  const ids = collectIds(pkg);
  return [
    ...checkDuplicates(pkg),
    ...checkRefs(pkg, ids),
    ...checkLabels(pkg),
    ...checkAmbiguity(pkg),
    ...checkReadiness(pkg),
    ...checkMd(pkg, md),
    ...checkMdOrphanIds(pkg, md, ids),
  ];
}
```

Note: `checkMdOrphanIds` findings are deduplicated naturally only per match; repeated unknown ids repeat — acceptable.

- [ ] **Step 5: Run tests to verify they pass**

Run: `node --test plugins/business-analyst/skills/business-analyst/scripts/test/checks.test.mjs`
Expected: all PASS

- [ ] **Step 6: Commit**

```bash
git add plugins/business-analyst/skills/business-analyst/scripts
git commit -m "feat(business-analyst): md sync checks and package orchestrator"
```

---

### Task 6: validate.mjs CLI + fail fixture + e2e test

**Files:**
- Create: `plugins/business-analyst/skills/business-analyst/scripts/validate.mjs`
- Create: `plugins/business-analyst/skills/business-analyst/scripts/test/fixtures/requirements-fail.json`
- Test: `plugins/business-analyst/skills/business-analyst/scripts/test/e2e.test.mjs`

**Interfaces:**
- Consumes: `checkPackage` from `./lib/checks.mjs`.
- Produces: CLI `node scripts/validate.mjs --json <file> --md <file>` — exit 0 + `requirements package valid`, or exit 1 with findings on stderr. SKILL.md (Task 11) names this command.

- [ ] **Step 1: Write the fail fixture** — copy `requirements-pass.json` to `requirements-fail.json`, then apply exactly these three edits:
  - `requirements[1].text` → `"The system must be user-friendly and record audit trails as needed."`
  - `requirements[0].traces.rules` → `["BR-999"]`
  - `readiness.overall` → `95`

- [ ] **Step 2: Write the failing e2e test** `scripts/test/e2e.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../validate.mjs', import.meta.url));
const fx = (f) => fileURLToPath(new URL(`./fixtures/${f}`, import.meta.url));
const run = (json, md) =>
  execFileSync('node', [script, '--json', fx(json), '--md', fx(md)], { encoding: 'utf8' });

test('validate.mjs exits 0 on the pass pair', () => {
  assert.match(run('requirements-pass.json', 'requirements-pass.md'), /requirements package valid/);
});

test('validate.mjs exits non-zero on a broken package', () => {
  assert.throws(() => run('requirements-fail.json', 'requirements-pass.md'));
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node --test plugins/business-analyst/skills/business-analyst/scripts/test/e2e.test.mjs`
Expected: FAIL — validate.mjs not found

- [ ] **Step 4: Write** `scripts/validate.mjs` (same shape as the estimate skill's):

```js
import { readFileSync } from 'node:fs';
import { checkPackage } from './lib/checks.mjs';

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith('--')) args[argv[i].slice(2)] = argv[++i];
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const md = readFileSync(args.md, 'utf8');
const pkg = JSON.parse(readFileSync(args.json, 'utf8'));
const findings = checkPackage({ pkg, md });
if (findings.length) {
  console.error(findings.join('\n'));
  process.exit(1);
}
console.log('requirements package valid');
```

- [ ] **Step 5: Run all skill tests**

Run: `node --test plugins/business-analyst/skills/business-analyst/scripts/test/*.test.mjs`
Expected: all PASS

- [ ] **Step 6: Commit**

```bash
git add plugins/business-analyst/skills/business-analyst/scripts
git commit -m "feat(business-analyst): validate cli with e2e fixtures"
```

---

### Task 7: references/writing.md

**Files:**
- Create: `plugins/business-analyst/skills/business-analyst/references/writing.md`

**Interfaces:**
- Consumes: the canonical fixture (Task 2) and `AMBIGUOUS` list (Task 4) — content must match both.
- Produces: the writing contract SKILL.md step 7 points at.

- [ ] **Step 1: Write the file** with this content:

````markdown
# Writing the requirements package

Two artifacts, always together, in the lead directory:

- `requirements.md` — the human document. Five parts (below).
- `requirements.json` — the machine handoff downstream skills read.

The canonical json shape is `scripts/test/fixtures/requirements-pass.json` —
copy its structure exactly; the validator enforces it. `schemaVersion` is
`"1.0"`; bump only on a breaking shape change.

## ID conventions

| Prefix | Register | Prefix | Register |
| --- | --- | --- | --- |
| G- | goals (context.goals) | NFR- | non-functional requirements |
| ACT- | actors | INT- | integrations |
| WF- | workflows | DAT- | data entities |
| FR- | functional requirements | CON- | constraints (hard limits) |
| BR- | business rules | ASM- | assumptions (unverified beliefs) |
| SC- | scenarios | Q- | open questions |
| | | CONFLICT- | contradictions |

Three digits, zero-padded (`FR-001`). IDs are stable: never renumber on
re-run; retired items keep their id with a note rather than vanishing.

Constraint vs assumption: a constraint is a confirmed boundary ("must run in
the client's M365 tenant"); an assumption is an unverified belief ("managers
authenticate through Entra"). Never file one as the other.

## Label discipline

Every requirement, NFR, integration and data row carries
`label: confirmed | assumed | recommended` and (where the schema asks) a
`source`. Recommendations never render as confirmed requirements; a
`recommended` item in scope `in` must have an open question referencing it
(the validator enforces this).

## Ambiguous terms — banned in requirement text

fast, quick, easy, simple, user-friendly, intuitive, flexible, robust,
seamless, efficient, optimal, appropriate, various, etc, some, many,
several, as needed.

Replace with a measurable statement: not "the search must be fast" but
"search results return within 2 seconds for 10,000 records". This list is
mirrored in `scripts/lib/checks.mjs` (`AMBIGUOUS`) — change both together.

## requirements.md structure

Frontmatter (must match the json — the validator checks status and readiness):

```yaml
---
lead: <lead-id>
status: <status enum>
depth: QUICK | STANDARD | DEEP
updated: YYYY-MM-DD
readiness: <overall number>
---
```

- **Part 1 — Discovery Brief**: problem, goals table (id, goal, metric),
  one benefit hypothesis per goal ("we believe *capability* will result in
  *outcome*, measured by *metric*"), stakeholders (add a power-interest
  table when more than 3 stakeholder groups), pain points, constraints.
- **Part 2 — Process & Domain**: as-is workflows (mermaid flowchart when a
  workflow has more than one actor), decision points, business-rules table
  with concrete examples, exceptions, to-be capabilities, glossary of
  domain terms.
- **Part 3 — Requirements**: scope (out / future / unconfirmed — in-scope
  is the FR table itself), actors and permissions, FR table (id, text,
  label, scope), NFRs, data, integrations, dependencies.
- **Part 4 — Acceptance Scenarios**: per critical FR a given/when/then
  table; input → expected tables for rule-heavy requirements.
- **Part 5 — Readiness Report**: readiness per area and overall, open
  questions register, assumptions register, conflicts register,
  architecture blockers. Registers live HERE only — other parts reference
  ids (one home per fact).

Section headings must be exactly `## Part N — <title>` — the validator
matches on `## Part N`.

Depth scaling: QUICK writes Parts 1, 3 (slim) and 5 only; STANDARD all
five; DEEP all five plus example-mapping tables and full scenario coverage.

## Honest absences

An unknown renders as an honest absence — "Not provided — asked, awaiting
client", "Not applicable — <reason>" — never `[TODO]`, `TBD`, `XXX`, never
an invented value. The validator refuses placeholders.

## Readiness scoring

You judge each area score (0–100) and justify it in Part 5 prose. The
script recomputes `overall` as the rounded mean and refuses a mismatch.
Status rules the validator enforces:

- open P1 question with `architectureBlocker: true` → status at most `ANALYZED`;
- `READY_FOR_ARCHITECTURE` requires no unconfirmed high-impact assumptions
  and no open conflicts;
- every open architecture blocker appears in `readiness.blockers`.
````

- [ ] **Step 2: Verify sections + banned-list parity**

Run: `grep -c '^## ' plugins/business-analyst/skills/business-analyst/references/writing.md`
Expected: 6
Run: `grep -o 'user-friendly' plugins/business-analyst/skills/business-analyst/references/writing.md | head -1`
Expected: `user-friendly` (list present)

- [ ] **Step 3: Commit**

```bash
git add plugins/business-analyst/skills/business-analyst/references/writing.md
git commit -m "docs(business-analyst): writing contract reference"
```

---

### Task 8: references/interview.md

**Files:**
- Create: `plugins/business-analyst/skills/business-analyst/references/interview.md`

- [ ] **Step 1: Write the file** with this content:

````markdown
# Clarification interview

Behave like an experienced BA interviewer: extract everything from the
inputs first, then ask only about holes, highest impact first.

## §1 Question priority

- **P1 — blocking**: scope or architecture cannot reasonably proceed
  without the answer. Mark `architectureBlocker: true` when the answer
  changes system boundaries, integrations, decision authority, or data
  ownership.
- **P2 — high impact**: could materially change scope, complexity, or cost.
- **P3 — detail**: safely deferred; record in the register, don't ask now.

Triage rule: ask P1s first, in groups of at most 4 related questions per
message. Never move to P2 while an easy-to-answer P1 is open.

## §2 Question rules

1. Never ask what the inputs already answer.
2. Ground every question in what the client said: "You mentioned approved
   contracts are stored in SharePoint. Does the new system need to A. read
   from it, B. write back, C. both, D. neither?" — offer concrete options
   where possible.
3. Explain why a question matters when the answer is expensive to get.
4. Adapt: each round of answers reprioritizes the remaining gaps.
5. Prefer a real example over an abstract description: "walk me through
   the last time this happened" beats "how does this normally work".
6. Challenge vague words (see the banned list in writing.md): "how fast is
   fast — what is acceptable in seconds?"
7. Distinguish **unknown** (client doesn't know yet — record the question)
   from **undecided** (client must choose — present the options and the
   consequence of each).
8. Contradictions are surfaced, never resolved silently (§5).

## §3 Sequencing shapes

- **Funnel** (broad → narrow): default for vague inputs ("we need a
  chatbot"). Start at business problem, narrow to workflows, rules, edge
  cases.
- **Pyramid** (narrow → broad): for detailed-but-suspect inputs (a feature
  list with no why). Start from a concrete feature, climb to the goal it
  serves — features that climb to no goal become open questions.
- **Diamond** (narrow → broad → narrow): for existing-system work. Start
  from the pain point, widen to the surrounding process, narrow back to
  the change.

## §4 The nine layers

Work through these progressively; the depth mode decides how far.

1. **Business context** — why now, cost of doing nothing, desired outcome,
   success metric. Ask: "What business result should improve, and how will
   you measure it?"
2. **Stakeholders and actors** — users, deciders, approvers, external and
   system actors. Per actor: goal, decisions, information needed, pain.
3. **Current state (as-is)** — trigger, steps, decisions, handoffs,
   systems, manual work, exceptions, workarounds. Always request a recent
   real example.
4. **Business rules** — explicit and implied. Per rule: statement, source,
   two concrete examples (one inside, one outside the boundary).
5. **Scenarios** — happy path, alternatives, edge cases, errors, missing
   information, cancellation, human intervention.
6. **Future state** — pain point → desired change → required capability.
   Capabilities, not implementations.
7. **Functional requirements** — convert validated capabilities into FRs
   with traces (goal, workflow, rules) and acceptance scenarios.
8. **NFRs** — investigate only relevant areas (security, privacy,
   performance, availability, auditability, compliance, retention,
   localization, device support). Never run the full list mechanically.
9. **Integrations and data** — systems, direction (read/write/both),
   identity, then per entity: source of truth, ownership, volume,
   sensitivity, retention, synchronization.

## §5 Contradiction protocol

When two statements conflict: record a `CONFLICT-` entry quoting both
statements with their sources, present it to the user verbatim, and ask
which holds (or whether both do under different conditions). Never pick an
interpretation yourself. A conflict stays open until the client resolves
it; open conflicts block READY_FOR_ARCHITECTURE.

## §6 Depth modes

- **QUICK**: layers 1, 2, 6, 7 only; P1 questions only; one interview round.
- **STANDARD**: all layers; P1 + P2; iterate until P1s are answered or
  explicitly parked.
- **DEEP**: all layers; P1–P3; example mapping on every complex rule;
  scenario tables for every critical FR.
````

- [ ] **Step 2: Verify**

Run: `grep -c '^## §' plugins/business-analyst/skills/business-analyst/references/interview.md`
Expected: 6

- [ ] **Step 3: Commit**

```bash
git add plugins/business-analyst/skills/business-analyst/references/interview.md
git commit -m "docs(business-analyst): interview engine reference"
```

---

### Task 9: references/frameworks.md

**Files:**
- Create: `plugins/business-analyst/skills/business-analyst/references/frameworks.md`

- [ ] **Step 1: Write the file** with this content:

````markdown
# Framework selection

Pick by symptom, never apply all. Justify each pick to the user in one
line. Two frameworks per engagement is typical; four is the ceiling.

| Symptom in the input | Framework |
| --- | --- |
| Request names a solution, problem unclear ("we need a chatbot") | 5 Whys |
| Manual workflow described; stated process may differ from reality | Contextual inquiry |
| Multiple actors, approvals, handoffs | Process mapping |
| Feature list with no link to outcomes | Impact mapping |
| Complex or ambiguous business rules, edge cases matter | Example mapping |
| Product scope / MVP boundary undefined | Story mapping |
| Behavior must be precise, rule-heavy | Specification by example |
| Requirements mature enough to test | Given / When / Then |

## 5 Whys
Ask "why" down from the stated solution until a business problem appears
(usually 3–5 levels). Produces: root problem, motivation, outcome.
Example: "We need a chatbot" → why → "support tickets take 2 days" → why →
"tier-1 answers are manual" → root problem: repetitive tier-1 load.

## Contextual inquiry
Ask the client to walk through a recent real case, step by step, naming
systems and people. Produces: the actual process, workarounds, hidden
steps, pain points. Trigger phrase: "Walk me through the last time…"

## Process mapping
Draw the as-is flow (actors, decisions, handoffs) as a mermaid flowchart;
confirm; then draw to-be. Produces: WF- entries, decision points,
exceptions.

## Impact mapping
WHY (business goal) → WHO (actors) → HOW (behavior change) → WHAT
(capability). A feature that maps to no WHY becomes an open question, not
a requirement.

## Example mapping
Per story: rules (blue), examples per rule (green), questions (red).
Every complex BR- gets at least one example inside and one outside the
boundary — these become SC- entries.

## Story mapping
Activities across the top, tasks below, slice releases horizontally.
Produces: capabilities, journey order, MVP line → scope in/future.

## Specification by example
Turn each agreed rule into concrete input → expected-output rows
(the Part 4 tables). Disagreement over a row = an undiscovered rule.

## Given / When / Then
Final form for acceptance: `Given <state> When <event> Then <outcome>`.
Use once requirements are stable; earlier it hardens guesses.
````

- [ ] **Step 2: Verify**

Run: `grep -c '^## ' plugins/business-analyst/skills/business-analyst/references/frameworks.md`
Expected: 8

- [ ] **Step 3: Commit**

```bash
git add plugins/business-analyst/skills/business-analyst/references/frameworks.md
git commit -m "docs(business-analyst): framework selection reference"
```

---

### Task 10: references/ai-extension.md + references/review.md

**Files:**
- Create: `plugins/business-analyst/skills/business-analyst/references/ai-extension.md`
- Create: `plugins/business-analyst/skills/business-analyst/references/review.md`

- [ ] **Step 1: Write** `references/ai-extension.md`:

````markdown
# AI-specific investigation

Trigger: the solution involves AI, an agent, an LLM, a chatbot, ML
classification, or "automation with judgment". When triggered, work
through all six areas below and fill the json `ai` object (otherwise it
stays `null`).

## Areas

1. **Agent responsibility** — which decisions or actions does the AI
   perform, exactly?
2. **Decision boundary** — for each responsibility: does the AI
   *recommend*, *decide*, or *execute*? Push for one verb per action.
3. **Human-in-the-loop** — which actions require review, approval, or
   escalation, and by whom (an ACT- id)?
4. **Tool access** — which systems may the agent read? Which may it write
   or act on? Map each to an INT- entry.
5. **Failure handling** — expected behavior when confidence is low, input
   is incomplete, a tool fails, results conflict, or policy blocks action.
6. **Evaluation requirements** — representative test cases, expected and
   unacceptable behavior, quality metric, threshold. Ask for real sample
   data ("can you provide 20 contracts with known-good answers?").

## json shape

```json
"ai": {
  "decisionBoundary": [{ "action": "flag risky clauses", "authority": "recommend" }],
  "hitl": [{ "action": "contract approval", "gate": "lawyer review", "actor": "ACT-003" }],
  "toolAccess": [{ "integration": "INT-002", "access": "read" }],
  "failureHandling": [{ "condition": "low confidence", "behavior": "escalate to lawyer queue" }],
  "evalRequirements": [{ "capability": "risky-clause detection", "dataset": "200 representative contracts", "metric": "recall on critical risks", "threshold": ">= 0.95" }]
}
```

Guardrails ("the agent cannot approve contracts") are business rules —
file them as BR- entries and reference them from the affected FR.
````

- [ ] **Step 2: Write** `references/review.md`:

````markdown
# Fresh-eyes review

After validate.mjs passes, dispatch ONE subagent with fresh eyes over both
artifacts. Give it the two file paths and this checklist verbatim. Apply
its findings, re-run validate.mjs, and stop after one cycle — do not loop.

## Checklist

1. **Invented requirements**: is any `confirmed` item unsupported by a
   quoted source? Downgrade to `assumed` or `recommended`.
2. **Hidden solutioning**: does any FR prescribe a technology or
   architecture ("use SharePoint webhooks")? Rewrite as a capability.
3. **Vague requirements**: any FR that two reasonable readers would
   implement differently? Flag with the two readings.
4. **Missed contradictions**: do any two statements (rules, scopes,
   answers) conflict without a CONFLICT- entry?
5. **Unlabeled scope**: any capability discussed in Parts 1–2 that appears
   in no FR and no scope list (out / future / unconfirmed)?
6. **Readiness honesty**: do the area scores overstate what Parts 1–4
   actually contain? Name the section that contradicts the score.
7. **Traceability spot-check**: pick 3 FRs; do their traces point at
   goals/workflows/rules that genuinely motivate them?

Report findings as a list: `<artifact>:<id or section> — <problem> — <fix>`.
No praise, no rewrites beyond the flagged items.
````

- [ ] **Step 3: Verify**

Run: `ls plugins/business-analyst/skills/business-analyst/references/`
Expected: `ai-extension.md  frameworks.md  interview.md  review.md  writing.md`

- [ ] **Step 4: Commit**

```bash
git add plugins/business-analyst/skills/business-analyst/references
git commit -m "docs(business-analyst): ai extension and review references"
```

---

### Task 11: SKILL.md + README.md

**Files:**
- Create: `plugins/business-analyst/skills/business-analyst/SKILL.md`
- Create: `plugins/business-analyst/skills/business-analyst/README.md`

**Interfaces:**
- Consumes: all reference files (Tasks 7–10) and the validate CLI (Task 6) — names must match exactly.

- [ ] **Step 1: Write** `SKILL.md`:

````markdown
---
name: business-analyst
description: Interview-driven requirements discovery — turn raw client input (emails, notes, transcripts, briefs) into a validated, traceable requirements package before solution architecture. Use when the user asks to analyze client requirements, run discovery on a lead, clarify a vague request, build a BA requirements package, or prepare requirements for architecture and estimation.
---

# business-analyst

Turn incomplete client input into two artifacts in the lead directory:
`requirements.md` (five parts, human-readable) and `requirements.json`
(machine handoff for analyze-requirements, estimate, and proposal).

## Hard rules

1. Never invent requirements — every material fact carries a label
   (`confirmed` | `assumed` | `recommended`) and a source. A
   recommendation never renders as a confirmed requirement.
2. Problem before solution — no technology recommendations, no
   architecture. This skill stops at WHAT; HOW belongs to
   analyze-requirements and later skills.
3. Unknowns render as open questions, never silently filled. Distinguish
   unknown (client doesn't know) from undecided (client must choose).
4. Never block on unanswered questions — write the package with an honest
   status and readiness; a re-run refines it, never restarts the interview.
5. Every requirement carries a stable ID and traceability links;
   `node scripts/validate.mjs` must exit 0 before the package is final.
6. The human reviews requirements.md before status may become
   `READY_FOR_ARCHITECTURE`.

## Flow

1. **Detect evidence**: input documents? an existing `requirements.json`
   (re-run — see Re-run)? greenfield or existing system? State findings;
   the user can override.
2. **Depth**: ask QUICK / STANDARD / DEEP first
   (`references/interview.md` §6).
3. **Extract**: pull every known goal, actor, process, rule, constraint,
   integration, and assumption from ALL inputs before asking anything.
4. **Gap analysis**: extracted knowledge vs the nine layers
   (`references/interview.md` §4) → prioritized P1/P2/P3 gap list.
5. **Select frameworks**: from `references/frameworks.md` — justify each
   pick in one line; never apply all.
6. **Interview**: per `references/interview.md` — grouped, adaptive,
   contradiction-challenging, example-hungry. Solution involves AI or
   agents → also work through `references/ai-extension.md`.
7. **Write**: requirements.md + requirements.json per
   `references/writing.md`.
8. **Validate**: `node scripts/validate.mjs --json <dir>/requirements.json
   --md <dir>/requirements.md` — fix findings, re-run until clean.
9. **Fresh-eyes review**: dispatch a subagent per `references/review.md`;
   apply findings, re-validate; one cycle max.
10. **Human review**: show Part 5 (readiness report); the human confirms
    the status. Only they can promote it to `READY_FOR_ARCHITECTURE`.

## Re-run

`requirements.json` already exists → diff the new answers and material into
the registers (answer open questions, confirm assumptions, add findings),
keep every existing ID stable, recompute readiness, and advance the status.
Never restart the interview; ask only what is still open.

## Handoff

Downstream skills treat `requirements.json` as detected evidence — never a
prerequisite. FR/BR/ASM/Q ids are stable so architecture decisions and
estimates can cite them.

## Dependency

Node ≥ 20. Scripts are dependency-free.
````

- [ ] **Step 2: Write** `README.md`:

````markdown
# business-analyst

Requirements discovery for pre-sales leads. Feed it raw client input —
emails, meeting notes, transcripts, briefs — and it interviews you to fill
the gaps, then writes a validated requirements package:

- `requirements.md` — discovery brief, process analysis, requirements,
  acceptance scenarios, readiness report (five parts, one file)
- `requirements.json` — machine-readable handoff with stable IDs

Designed to run before the solution-architect plugin's chain
(`analyze-requirements` → `estimate` → `proposal`); its `new-lead`
orchestrator offers this skill as step 0 when installed. Also works
standalone: `/business-analyst` in any project directory.

The package is gated by `scripts/validate.mjs`: schema, ID traceability,
label discipline, an ambiguity lint on requirement text, readiness math,
and md↔json consistency.

Requires Node ≥ 20. No npm dependencies.
````

- [ ] **Step 3: Verify reference names resolve**

Run: `cd plugins/business-analyst/skills/business-analyst && for f in $(grep -o 'references/[a-z-]*\.md' SKILL.md | sort -u); do test -f "$f" && echo "$f ok" || echo "$f MISSING"; done; cd -`
Expected: five `ok` lines, no `MISSING`

- [ ] **Step 4: Commit**

```bash
git add plugins/business-analyst/skills/business-analyst/SKILL.md plugins/business-analyst/skills/business-analyst/README.md
git commit -m "feat(business-analyst): skill definition and readme"
```

---

### Task 12: new-lead integration edit

**Files:**
- Modify: `plugins/solution-architect/skills/new-lead/SKILL.md`

**Interfaces:**
- Consumes: skill name `business-analyst`, artifact name `requirements.json` (Tasks 1, 11).

- [ ] **Step 1: Edit the frontmatter description** — replace:

```
description: Set up a pre-sales lead workspace and walk the human through the three solution-architect skills in order — analyze-requirements, estimate, proposal — plus a local leads dashboard. Use when the user says "new lead", points at a folder under leads/, or asks to see their leads pipeline.
```

with:

```
description: Set up a pre-sales lead workspace and walk the human through the solution-architect skills in order — business-analyst first when installed, then analyze-requirements, estimate, proposal — plus a local leads dashboard. Use when the user says "new lead", points at a folder under leads/, or asks to see their leads pipeline.
```

- [ ] **Step 2: Edit flow step 5** — replace:

```
5. **Chain**: for each of `/analyze-requirements`, `/estimate`, `/proposal` —
   `cd` to the lead directory, invoke the skill, and when it returns, report
   what it wrote and wait. Skip any step whose artifact already exists unless
   the human asks for a re-run.
```

with:

```
5. **Chain**: when the `business-analyst` skill is available, the chain is
   `/business-analyst`, `/analyze-requirements`, `/estimate`, `/proposal`;
   otherwise recommend installing the business-analyst plugin in one line
   (requirements discovery before architecture) and run the three-step
   chain. For each step — `cd` to the lead directory, invoke the skill,
   and when it returns, report what it wrote and wait. Skip any step whose
   artifact already exists unless the human asks for a re-run.
   `requirements.json` is soft evidence for the later skills, never a
   prerequisite.
```

- [ ] **Step 3: Edit the WIP state row** — replace:

```
| WIP | entry present, one of `ARCHITECTURE.md` / `estimation.json` / `proposal.md` missing | resume at the first gap |
```

with:

```
| WIP | entry present, one of `requirements.json` (checked only when the business-analyst skill is installed) / `ARCHITECTURE.md` / `estimation.json` / `proposal.md` missing | resume at the first gap |
```

(The `done` row stays "all three present" — the BA package is optional and never blocks done.)

- [ ] **Step 4: Verify**

Run: `grep -c 'business-analyst' plugins/solution-architect/skills/new-lead/SKILL.md`
Expected: 4 (description, chain ×2, WIP row)

- [ ] **Step 5: Commit**

```bash
git add plugins/solution-architect/skills/new-lead/SKILL.md
git commit -m "feat(new-lead): offer business-analyst as optional step 0"
```

---

### Task 13: Full suite + wrap-up

**Files:**
- None new.

- [ ] **Step 1: Run the full repository test suite**

Run: `npm test`
Expected: all PASS, including the new `schema.test.mjs`, `checks.test.mjs`, `e2e.test.mjs` (the root glob picks them up automatically).

- [ ] **Step 2: Run the validator against its own fixtures one last time**

Run: `node plugins/business-analyst/skills/business-analyst/scripts/validate.mjs --json plugins/business-analyst/skills/business-analyst/scripts/test/fixtures/requirements-pass.json --md plugins/business-analyst/skills/business-analyst/scripts/test/fixtures/requirements-pass.md`
Expected: `requirements package valid`

- [ ] **Step 3: Confirm working tree is clean**

Run: `git status --short`
Expected: empty (everything committed in Tasks 1–12)
