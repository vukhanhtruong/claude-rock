# Milestone 06 — The new-lead Skill (interview, workflows, gates)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Read `00-overview.md` Global Constraints first — and the spec (`docs/superpowers/specs/2026-08-07-new-lead-design.md`) in full before Task 3.

**Goal:** The orchestrator: `lead-upsert.mjs` registry CLI, the answers-file schema, the combined interview reference, the three workflow script templates, the review-lens prompts, and SKILL.md tying them together.

Base dir: `plugins/solution-architect/skills/new-lead/`. Depends on milestones 01 (registry lib) and 05 (orchestrated modes).

---

### Task 1: `scripts/lead-upsert.mjs`

**Files:**
- Create: `scripts/lead-upsert.mjs`
- Test: `scripts/test/lead-upsert.test.mjs`

**Interfaces:**
- Consumes: `readRegistry`, `writeRegistry` (milestone 01).
- Produces: CLI `node lead-upsert.mjs --root <dir> --id <lead-id> --patch '<json>'` — inserts the lead (with defaults `status:'active'`, `closed:null`, `value:null`, `scenario:null`) when absent, shallow-merges the patch when present; prints the resulting lead JSON; exits 1 with findings when the merged registry fails validation. This is the **only** way SKILL.md flows touch leads.json (lock-safe against a running server).

- [ ] **Step 1: Write failing tests**

```js
// scripts/test/lead-upsert.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const run = promisify(execFile);
const CLI = new URL('../lead-upsert.mjs', import.meta.url).pathname;

const makeRoot = async () => {
  const root = await mkdtemp(join(tmpdir(), 'up-'));
  await writeFile(join(root, 'leads.json'), JSON.stringify({ version: 1, leads: [] }));
  return root;
};

test('insert with defaults, then merge patch', async () => {
  const root = await makeRoot();
  await run('node', [CLI, '--root', root, '--id', 'acme-crm',
    '--patch', '{"client":"Acme","title":"CRM","created":"2026-08-07"}']);
  await run('node', [CLI, '--root', root, '--id', 'acme-crm',
    '--patch', '{"value":{"low":1,"high":2,"currency":"USD"},"scenario":"balanced"}']);
  const reg = JSON.parse(await readFile(join(root, 'leads.json'), 'utf8'));
  assert.equal(reg.leads.length, 1);
  assert.equal(reg.leads[0].client, 'Acme');
  assert.equal(reg.leads[0].scenario, 'balanced');
  assert.equal(reg.leads[0].status, 'active');
});
test('invalid merge rejected, registry untouched', async () => {
  const root = await makeRoot();
  await assert.rejects(
    () => run('node', [CLI, '--root', root, '--id', 'acme-crm', '--patch', '{"status":"open"}']),
    (err) => err.code === 1 && /status/.test(err.stdout + err.stderr));
  const reg = JSON.parse(await readFile(join(root, 'leads.json'), 'utf8'));
  assert.equal(reg.leads.length, 0);
});
```

- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement** — `parseArgs` for the three options; defaults object spread-merged as `{...DEFAULTS, id, ...existing, ...patch}`; `writeRegistry` does the validation + locking; catch its error → print message, exit 1. Whole file ≤ 40 lines, stamp comment on line 2 not needed (never copied to root).
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: `/simplify`, then commit** — `git commit -m "feat(new-lead): lock-safe lead upsert CLI"`

---

### Task 2: `references/answers-schema.md`

**Files:**
- Create: `references/answers-schema.md`

**Interfaces:**
- Produces: the `new-lead-answers.json` contract every other file cites. Milestone 05 sections and Task 4's workflow prompts already name these groups — keep the names exactly.

- [ ] **Step 1: Write the reference.** Required content — the annotated schema:

```jsonc
{
  "version": 1,
  "lead":     { "id": "acme-crm", "client": "Acme", "title": "CRM rebuild",
                "created": "2026-08-07" },
  "evidence": { "sources": [ { "type": "rfp|codebase|notes|none",
                "path": "rfp.md", "summary": "one-paragraph digest" } ] },
  "client":   { "industry": "", "contact": "", "techLevel": "non-technical|mixed|technical",
                "relationship": "new|returning" },
  "scope":    { "summary": "", "mustHave": [], "niceToHave": [], "outOfScope": [],
                "assumed": [] },              // assumed -> estimate labels these `proposed`
  "tech":     { "stack": [], "integrations": [], "hosting": "", "compliance": [] },
  "delivery": { "deadline": "", "budgetRange": "", "depth": "QUICK|STANDARD|DEEP",
                "technique": "", "teamNotes": "" },
  "proposal": { "validityDays": 30, "firmProfile": "", "storageScope": "",
                "scenario": null },           // set by the orchestrator at gate 2
  "decisions": []                             // appended by orchestrator + agents
}
```

Plus three rules, stated verbatim: (1) every field is optional except `version` and `lead.id` — a missing answer is an honest absence and downstream skills must treat it per their hard rules, never invent; (2) the file is generation truth — `leads.json` mirrors only registry fields and is never read for generation; (3) the orchestrator appends to `decisions` at every gate (technique confirm, scenario pick, gate verdicts) so the file is a self-contained audit trail.

- [ ] **Step 2: Cross-check names** against milestone 05's three appended sections (fields each cites: `evidence`, `scope`, `tech`, `delivery.depth`, `delivery.technique`, `client`, `proposal.scenario`, `proposal` profile fields) — every cited path must exist in the schema.
- [ ] **Step 3: Commit** — `git commit -m "docs(new-lead): answers file schema"`

---

### Task 3: `references/interview.md`

**Files:**
- Create: `references/interview.md`

**Interfaces:**
- Consumes: the three existing interview references — `arch-docs/references/interview.md`, `estimate/references/interview.md`, `proposal/references/interview.md`. **Read all three before writing** — the dedup table below must be completed from their actual section numbers.
- Produces: the staged combined interview SKILL.md step 3 follows.

- [ ] **Step 1: Write the reference.** Required content:

1. **UX rules** (verbatim): questions go out in themed batches via AskUserQuestion — ~4–6 questions per batch, one theme per round, multi-select where options aren't exclusive; never one wall of questions; every prefilled answer is shown for confirmation in its batch, marked with its evidence source; user can say "skip the rest" in any batch → remaining fields become honest absences.
2. **The five batches**, each with: purpose, the questions (concrete wording), which `answers-schema.md` group it fills, prefill source:
   - Batch 1 — Client & context → `client`, `lead` (client name, industry, contact, audience tech level, new/returning)
   - Batch 2 — Scope → `scope` (summary confirm, must-have list, nice-to-have, explicitly out, known assumptions)
   - Batch 3 — Tech & evidence → `tech` + `evidence` confirmations (stack constraints, integrations, hosting, compliance; "we found X in the RFP — correct?")
   - Batch 4 — Delivery & estimation → `delivery` (deadline, budget range, depth QUICK/STANDARD/DEEP, **technique: recommend from estimate's `references/techniques.md` with the stated why, confirm here**, team notes)
   - Batch 5 — Proposal prefs → `proposal` (validity days, firm profile, storage scope; note: scenario is NOT asked — it's picked at gate 2)
3. **Dedup table** — columns: `combined batch | arch-docs interview § | estimate interview § | proposal interview §`; one row per batch mapping which sections of each skill's own interview the batch replaces. Fill the `§` cells from the actual reference files read above; a section with no combined coverage means either add the question to a batch or document why it's intentionally dropped (e.g. answered by evidence scan).
4. **Prefill rules**: evidence scan runs before batch 1 — RFP/notes files are read and summarized into `evidence.sources`; a codebase source triggers arch-docs brownfield mode downstream; prefilled values always confirmed, never silently used.

- [ ] **Step 2: Self-check** — every `answers-schema.md` field is fillable by exactly one batch (or documented as gate-set/derived); no batch exceeds ~6 questions.
- [ ] **Step 3: Commit** — `git commit -m "docs(new-lead): combined staged interview reference"`

---

### Task 4: `references/workflows.md`

**Files:**
- Create: `references/workflows.md`

**Interfaces:**
- Consumes: orchestrated-mode sections (milestone 05), lens prompts (Task 5), answers schema (Task 2).
- Produces: three Workflow scripts SKILL.md launches verbatim (with `args` filled in). Every script takes `args = { leadDir, answersPath, skillsDir }` (+ per-script extras) and returns the fixer's report object.

- [ ] **Step 1: Write the reference.** It contains the three scripts in full fenced blocks plus the shared schemas. Shared part (verbatim):

```js
const REPORT = { type: 'object', required: ['files', 'validateExit', 'decisions'],
  properties: { files: { type: 'array', items: { type: 'string' } },
    validateExit: { type: 'number' },
    decisions: { type: 'array', items: { type: 'string' } } } };
const FINDINGS = { type: 'object', required: ['findings'],
  properties: { findings: { type: 'array', items: { type: 'object',
    required: ['claim', 'where', 'severity'],
    properties: { claim: { type: 'string' }, where: { type: 'string' },
      severity: { enum: ['high', 'medium', 'low'] } } } } } };
const FIXED = { type: 'object', required: ['applied', 'rejected', 'validateExit'],
  properties: { applied: { type: 'array', items: { type: 'string' } },
    rejected: { type: 'array', items: { type: 'object',
      required: ['claim', 'reason'], properties: { claim: { type: 'string' },
        reason: { type: 'string' } } } },
    validateExit: { type: 'number' } } };
```

**ARCH script** (verbatim in the reference):

```js
export const meta = {
  name: 'new-lead-arch',
  description: 'Architecture docs for a lead via headless arch-docs',
  phases: [{ title: 'Research' }, { title: 'Write' }, { title: 'Review' }, { title: 'Fix' }],
}
// args: { leadDir, answersPath, skillsDir, topics: [{key, prompt}] }
// topics are prepared by the orchestrator from answers.tech + evidence,
// per arch-docs references/research.md — typically 3-4 of: stack, integrations,
// hosting, compliance.
phase('Research')
const research = (await parallel(args.topics.map(t => () =>
  agent(`${t.prompt}\nLead answers: ${args.answersPath}. Follow ` +
    `${args.skillsDir}/arch-docs/references/research.md. Return your findings ` +
    `as compact JSON text: [{fact, source, confidence}].`,
    { label: `research:${t.key}`, phase: 'Research' }))))
  .filter(Boolean);

phase('Write')
const report = await agent(
  `Run the arch-docs skill in Orchestrated mode (read ` +
  `${args.skillsDir}/arch-docs/SKILL.md — the Orchestrated mode section governs). ` +
  `Answers file: ${args.answersPath}. Write the model and ARCHITECTURE.md into ` +
  `${args.leadDir}. Research findings to incorporate (tag researched facts with ` +
  `their source): ${JSON.stringify(research)}. Run the skill's validate.mjs ` +
  `until exit 0.`, { schema: REPORT, phase: 'Write' });

phase('Review')
const LENSES = ['provenance-integrity', 'internal-consistency', 'completeness-vs-interview'];
const reviews = (await parallel(LENSES.map(lens => () =>
  agent(`Review ${args.leadDir}/ARCHITECTURE.md through the "${lens}" lens defined in ` +
    `${args.skillsDir}/new-lead/references/review-lenses.md. Interview answers: ` +
    `${args.answersPath}. Report findings only — no fixes.`,
    { label: `review:${lens}`, phase: 'Review', schema: FINDINGS }))))
  .filter(Boolean).flatMap(r => r.findings);

phase('Fix')
const fixed = reviews.length === 0
  ? { applied: [], rejected: [], validateExit: report.validateExit }
  : await agent(`Apply the verify-then-fix protocol from ` +
      `${args.skillsDir}/new-lead/references/review-lenses.md to ` +
      `${args.leadDir}/ARCHITECTURE.md. Findings: ${JSON.stringify(reviews)}. ` +
      `Sources of truth: the answers file ${args.answersPath}, the model, and ` +
      `provenance tags. Re-run arch-docs validate.mjs until exit 0 after fixing.`,
      { schema: FIXED, phase: 'Fix' });
return { report, findings: reviews, fixed };
```

**ESTIMATE script** (verbatim; same shared schemas):

```js
export const meta = {
  name: 'new-lead-estimate',
  description: 'Estimate for a lead via headless estimate skill',
  phases: [{ title: 'Size' }, { title: 'Review' }, { title: 'Fix' }],
}
// args: { leadDir, answersPath, skillsDir }
phase('Size')
const report = await agent(
  `Run the estimate skill in Orchestrated mode (read ` +
  `${args.skillsDir}/estimate/SKILL.md — Orchestrated mode section governs; ` +
  `companion mode applies: ARCHITECTURE.md is in ${args.leadDir}). Answers file: ` +
  `${args.answersPath}. Write estimation-inputs.json, run compute.mjs, write ` +
  `estimation.md into ${args.leadDir}, run validate.mjs until exit 0.`,
  { schema: REPORT, phase: 'Size' });

phase('Review')
const LENSES = ['numbers-trace', 'assumptions-honesty'];
const reviews = (await parallel(LENSES.map(lens => () =>
  agent(`Review ${args.leadDir}/estimation.md and estimation.json through the ` +
    `"${lens}" lens from ${args.skillsDir}/new-lead/references/review-lenses.md. ` +
    `Answers: ${args.answersPath}. Findings only.`,
    { label: `review:${lens}`, phase: 'Review', schema: FINDINGS }))))
  .filter(Boolean).flatMap(r => r.findings);

phase('Fix')
const fixed = reviews.length === 0
  ? { applied: [], rejected: [], validateExit: report.validateExit }
  : await agent(`Verify-then-fix (protocol in ` +
      `${args.skillsDir}/new-lead/references/review-lenses.md) on the estimate ` +
      `files in ${args.leadDir}. Findings: ${JSON.stringify(reviews)}. Numbers may ` +
      `only change by editing estimation-inputs.json and re-running compute.mjs — ` +
      `never by hand. Re-run validate.mjs until exit 0.`,
      { schema: FIXED, phase: 'Fix' });
return { report, findings: reviews, fixed };
```

**PROPOSAL script** (verbatim):

```js
export const meta = {
  name: 'new-lead-proposal',
  description: 'Client proposal for a lead via headless proposal skill',
  phases: [{ title: 'Assemble' }, { title: 'Review' }, { title: 'Fix' }],
}
// args: { leadDir, answersPath, skillsDir }   (scenario already in answers.proposal.scenario)
phase('Assemble')
const report = await agent(
  `Run the proposal skill in Orchestrated mode (read ` +
  `${args.skillsDir}/proposal/SKILL.md — Orchestrated mode section governs; stop ` +
  `after writing + validating, per that section). Answers file: ${args.answersPath}. ` +
  `Lead dir: ${args.leadDir}. Run derive.mjs for figures; validate.mjs until exit 0.`,
  { schema: REPORT, phase: 'Assemble' });

phase('Review')
const reviews = (await parallel([
  () => agent(`Run the proposal fresh-eyes review per ` +
    `${args.skillsDir}/proposal/references/review.md on ${args.leadDir}/proposal.md. ` +
    `Report findings only, as JSON findings.`,
    { label: 'review:fresh-eyes', phase: 'Review', schema: FINDINGS }),
  () => agent(`Review ${args.leadDir}/proposal.md through the "client-readability" ` +
    `lens from ${args.skillsDir}/new-lead/references/review-lenses.md. Client tech ` +
    `level is in ${args.answersPath}. Findings only.`,
    { label: 'review:readability', phase: 'Review', schema: FINDINGS }),
])).filter(Boolean).flatMap(r => r.findings);

phase('Fix')
const fixed = reviews.length === 0
  ? { applied: [], rejected: [], validateExit: report.validateExit }
  : await agent(`Verify-then-fix (protocol in ` +
      `${args.skillsDir}/new-lead/references/review-lenses.md) on ` +
      `${args.leadDir}/proposal.md. Findings: ${JSON.stringify(reviews)}. Every ` +
      `number must trace to proposal-figures.json (derive.mjs output). One ` +
      `re-review cycle max. Re-run proposal validate.mjs until exit 0.`,
      { schema: FIXED, phase: 'Fix' });
return { report, findings: reviews, fixed };
```

Also state in the reference: launch via the Workflow tool with the script inline and `args` as a JSON object; on failure resume with `Workflow({scriptPath, resumeFromRunId})` — the tool result carries both values; a `null` `report` (agent died) is a failed phase — surface it, never fabricate.

- [ ] **Step 2: Self-check** — every path a prompt cites exists (`review-lenses.md`, `review.md`, both `SKILL.md` Orchestrated sections); the barrier in ARCH (research → write) is genuine (writer needs all research); no `Date.now()`/`Math.random()` anywhere in scripts.
- [ ] **Step 3: Commit** — `git commit -m "docs(new-lead): workflow script templates"`

---

### Task 5: `references/review-lenses.md`

**Files:**
- Create: `references/review-lenses.md`

- [ ] **Step 1: Write the reference.** Required content, all verbatim-ready prompts:

1. **Lens definitions** (each 3–5 sentences: what to hunt, what to ignore, findings format reminder):
   - `provenance-integrity` — every fact carries a provenance tag; `observed`/`researched` claims must have a source; a `proposed` fact rendered as settled is a high finding. Ignore style.
   - `internal-consistency` — diagrams vs tables vs prose: one home per fact; contradictions between sections; ids that don't exist in the model.
   - `completeness-vs-interview` — every `scope.mustHave` item appears in the doc; every stated constraint (tech, compliance, deadline) is reflected or explicitly deferred; unanswered questions rendered as honest absences, not filled in.
   - `numbers-trace` — every number in estimation.md exists in estimation.json (compute.mjs output); rows without confidence+assumptions; any `0` where `not estimated` belongs.
   - `assumptions-honesty` — scope items labeled `stated` that the answers file doesn't actually state; blanket AI multipliers; slices that were computed rather than judged.
   - `client-readability` — jargon above the client's `techLevel`; internal scenario names or non-offered scenarios leaking; sections that assume knowledge the client lacks.
2. **Verify-then-fix protocol** (the fixer's contract): for each finding — locate the claim; check it against sources in priority order (script outputs `estimation.json`/`proposal-figures.json` → answers file → the doc's own provenance tags); verdicts true / partly true / wrong; fix true parts only, log rejected parts with evidence; numbers change only via inputs + re-running the compute script; re-run the document's validate.mjs until exit 0; return `{applied, rejected, validateExit}`. Reviewer opinion never outranks a source file.
3. **Brief-writer prompt** (used by SKILL.md at each gate): "Write/update `brief.md` in the lead dir: an executive summary (4–5 sentences: who the client is, what we'd build, why, where the deal stands) followed by a `## Decisions` section listing entries from the answers file's `decisions` plus the gate's applied/rejected counts. Sources: answers file, ARCHITECTURE.md intro, estimation.json totals, proposal.md summary — whichever exist. Never invent facts."

- [ ] **Step 2: Cross-check** — lens names match exactly the strings used in Task 4's scripts (`LENSES` arrays and the readability prompt).
- [ ] **Step 3: Commit** — `git commit -m "docs(new-lead): review lenses and verify-then-fix protocol"`

---

### Task 6: `SKILL.md` + README

**Files:**
- Create: `SKILL.md`, `README.md`
- Verify: plugin manifest (`plugins/solution-architect/.claude-plugin/plugin.json`) — check whether skills are listed explicitly; if so, add `new-lead`; if auto-discovered, no change.

**Interfaces:**
- Consumes: everything above. The flow below is the deliverable — keep its numbered steps aligned with the spec's "Orchestration flow" section.

- [ ] **Step 1: Write SKILL.md.** Frontmatter:

```markdown
---
name: new-lead
description: Orchestrate a new pre-sales lead end-to-end — one combined interview, then architecture docs, estimate, and proposal produced by parallel-agent workflows with a human gate per document — plus a leads dashboard. Use when the user says "new lead", wants all three solution-architect documents for a client, or asks to manage/see their leads pipeline.
---
```

Body — required sections (write out fully; target 100–140 lines like the sibling skills):

1. **Hard rules**: (1) one gate per document — no document advances to the next phase without explicit user approval; (2) workflows never talk to the user — anything interactive happens in this flow, before or between workflows; (3) generation truth is `new-lead-answers.json`; `leads.json` is registry-only and is touched exclusively via `scripts/lead-upsert.mjs`; (4) a failed workflow is reported, resumed with `resumeFromRunId` — never silently rerun from scratch; (5) rendering happens per phase at its gate, orchestrator-owned.
2. **Flow** (numbered, mirroring the spec): root discovery (walk up for `leads.json`; missing → confirm init at cwd, run `init-root.mjs`, offer `git init`) → evidence scan (list files given/present; classify rfp/notes/codebase; summarize into `evidence.sources`) → combined interview per `references/interview.md` → derive the lead id (kebab-case client+project; if the dir already exists for a *different* lead, suffix `-2`, `-3`, … — never overwrite; same lead → resume mode) → write `new-lead-answers.json` (schema in `references/answers-schema.md`), `lead-upsert` the registry entry, commit → Workflow ARCH (script + args per `references/workflows.md`) → **Gate 1**: show ARCHITECTURE.md + applied/rejected report; on approval render the arch viewer per arch-docs `references/viewer.md` into `dist/`, brief-writer prompt, commit `"<id>: architecture approved"` → Workflow ESTIMATE → **Gate 2**: show estimation.md; user picks the scenario; write it to `answers.proposal.scenario` + registry `value`/`scenario` via lead-upsert; render estimate.html per estimate SKILL step 9 into `dist/`; brief, commit → Workflow PROPOSAL → **Gate 3**: show proposal.md + report; on approval render proposal.html per proposal SKILL step 8 into `dist/`; brief, commit → wrap: report dashboard URL (`node serve.mjs` from root if not running).
3. **Gate mechanics**: each gate presents — the document path, `applied: N, rejected: M (reasons)`, decisions logged; verdicts: approve / request changes (fold into answers or a fix note, resume the workflow) / abort (lead stays `active`; user may mark it lost on the dashboard).
4. **Resume** (`/new-lead <existing-id>`): lead dir exists → diff current answers against what the user wants changed; rerun only phases whose inputs changed (arch → everything after; estimate → estimate+proposal; proposal → proposal); artifacts present and inputs unchanged → skip that phase.
5. **Failure**: workflow incomplete → per-phase status table (done / failed with the exact validate finding / never-ran); options retry (resume), fix inputs then retry, abort. Files already written stay in the lead dir.
6. **Dependency**: Node ≥ 20 and `npx likec4` (arch rendering) — check upfront, stop before any work if missing.

- [ ] **Step 2: Write README.md** — short: what the skill orchestrates, the three-gate diagram, workspace layout sketch, standalone-vs-orchestrated note (existing skills unchanged when invoked directly), dashboard quickstart (`./start.sh`).

- [ ] **Step 3: Verify plugin loads** — `claude --version` sanity, then in a scratch session confirm `/new-lead` appears in the skill list (or `grep`-check the manifest mechanism the other three skills use and mirror it exactly).

- [ ] **Step 4: Self-check against spec** — walk the spec's "Orchestration flow" + "Failure and retry" + "Decisions" table; every numbered spec step has a home in SKILL.md; interview never happens inside a workflow; scenario pick is at gate 2.

- [ ] **Step 5: Commit** — `git commit -m "feat(new-lead): orchestrator skill"`

---

**Milestone exit criteria:** upsert tests green; all five reference/skill files exist; cross-references between them resolve (paths, lens names, schema field names); plugin exposes `/new-lead`.
