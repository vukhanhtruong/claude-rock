# Estimate Skill — Design

Date: 2026-08-04
Status: approved (brainstorming session)

## Purpose

A new user-invocable agent skill, `estimate`, that interviews an engineer over
whatever evidence they have, separates confirmed scope from assumptions, picks
the estimation technique that fits the evidence, models AI-assisted delivery
(engineers + Claude Code plan), and produces estimation files rendered as both
a validated markdown document and an interactive what-if web page served by
the existing viewer web server.

## Decisions made

| Decision | Choice |
|---|---|
| Placement | Sibling skill inside the existing plugin; plugin renamed `arch-docs` → `solution-architect` |
| Inputs | All four: requirements/RFP/backlog, ARCHITECTURE.md, codebase, engineer's head — one pipeline with input detection |
| Audience | Dual view: internal (task detail, rates, multipliers) + client-facing (feature ranges, timeline, team, cost summary) |
| AI modeling | Scenario comparison — compute 2-3 staffing scenarios (e.g. "3 eng no AI" vs "2 eng + Claude Max 5x"), recommend one |
| Interactivity | Live what-if controls — sliders recompute duration/cost client-side |
| Architecture | Approach A: standalone `estimate.html` page beside the arch-docs viewer; no changes to `viewer-template.html` |

## Research references applied

| Source | Applied as |
|---|---|
| Atomic Object "Better Custom Software Estimates" | Range estimates (ABP/HP), decomposition-first, assumptions + risks recorded formally, discrete tiers against false precision, risk buffer = probability × impact, √Σσ² project buffer |
| Kmino "Software Estimation with AI" | Per-task AI-impact categories (CRUD 50-80% reduction, business logic 20-40%, architecture ~0%), formula `(AO + 2×AR + TR) / 4`, seniority scaling, blanket-multiplier prohibition, historical-velocity invalidation |
| Modular Earth `estimate` SKILL.md | Complexity factor scoring, confidence HIGH/MED/LOW per component, depth tiers QUICK/STANDARD/DEEP, multi-method cross-validation. Its gap — no interview — is what this skill adds |
| User's existing technique | Factor-scored tiering: 5 factors (tech complexity, feature size, dependencies, uncertainty, risk) scored 1-5 per feature → total → S/M/L tier → range. First-class technique in `techniques.md` with these factors as default |

## 1. Plugin layout

```
plugins/solution-architect/           ← renamed from arch-docs
├── skills/
│   ├── arch-docs/                    ← untouched except plugin-name refs
│   └── estimate/                     ← NEW
│       ├── SKILL.md                  ← flow + hard rules, mirrors arch-docs style
│       ├── references/
│       │   ├── interview.md          ← adaptive interview script
│       │   ├── techniques.md         ← technique selection decision table
│       │   ├── ai-multipliers.md     ← AI-impact categories, dated plan pricing table
│       │   └── writing.md            ← estimation.md + JSON contracts
│       ├── scripts/
│       │   ├── compute.mjs           ← deterministic math
│       │   ├── validate.mjs          ← estimation-specific contract checks
│       │   ├── lib/estimate-math.mjs ← formulas shared by compute.mjs and the page
│       │   └── test/
│       └── assets/
│           └── estimate-template.html ← self-contained what-if page
```

Shared from the arch-docs skill via relative in-plugin paths: `serve.mjs`,
provenance vocabulary (`observed / stated / researched / proposed`), honesty
rules. Skill names stay `arch-docs` and `estimate`; only the plugin directory,
manifest, and marketplace entry rename.

### Hard rules

1. Every estimate row carries confidence + assumptions. A row nobody estimated
   renders `not estimated` — never `0`.
2. Clear-vs-assumed split is explicit: every scope item is labeled `stated`
   (confirmed) or `proposed` (assumption), no unlabeled scope.
3. Agent judges, script computes — no LLM arithmetic reaches a deliverable.
4. Never apply one blanket AI multiplier to a whole project — per-task
   category only (Kmino non-uniformity warning).
5. `validate.mjs` must exit 0 before the page renders.

### Invocation

User-invocable (`/solution-architect:estimate`) and auto-triggered via the
skill description (estimate, effort, quote, proposal, timeline, staffing).

## 2. Flow

```
1. DETECT     scan for evidence: requirements/RFP? ARCHITECTURE.md? codebase? none?
              state findings; user can override
2. TIER       ask depth: QUICK (feature tiers, wide ranges) / STANDARD (task-level
              three-point) / DEEP (adds scenario detail)
3. INTERVIEW  references/interview.md — only the gaps evidence didn't fill:
              scope confirm → clear-vs-assumed split → factor scores → team/rates
              → deadline/constraints
4. DECOMPOSE  features → units → tasks (depth per tier), each item stated/proposed
5. TECHNIQUE  skill recommends from techniques.md decision table, states why,
              user confirms
6. SIZE       agent judges per task (three-point O/M/P or factor scores + AI-impact
              category) → writes estimation-inputs.json
7. COMPUTE    scripts/compute.mjs → estimation.json (PERT, buffers, multipliers,
              scenario rollups)
8. WRITE      estimation.md (companion contract)
9. VALIDATE   scripts/validate.mjs exit 0 gate
10. RENDER    estimate-template.html + estimation.json → estimate.html;
              serve via shared serve.mjs, report URL
```

Behaviors:

- **Delta-driven interview**: evidence pre-fills rows; the agent shows the
  pre-filled table with provenance first, then asks only holes. Never re-asks
  what the RFP already states.
- **Clear-vs-assumed gate** (step 3): before sizing, the agent presents
  "confirmed scope" vs "assumptions I'm making"; the user corrects. Assumptions
  land in the output verbatim with impact-if-wrong.
- **Steps 3/5/6 loop** when sizing exposes scope holes (decomposition reveals
  hidden requirements).
- **Companion mode**: when ARCHITECTURE.md exists, §6 components seed the WBS,
  §15 risks seed the risk register, `electedDocs` gets its estimation entry
  flipped to `elected: true`, and estimation.md fills the existing companion
  slot (it also renders as a static page in the main arch-docs viewer; the
  interactive page is linked from it).

## 3. Methodology

### Technique decision table (`techniques.md`)

| Evidence quality | Recommended technique | Precision |
|---|---|---|
| Vague RFP, no history | factor-scored tiering (5 factors) at feature level | ±100%, bands |
| Detailed backlog or ARCHITECTURE.md | task-level three-point PERT | ±50% |
| Backlog + codebase + calibration data | PERT + analogy cross-check; flag divergence >30% | ±25% |
| Change request on a known repo | analogy to similar past change + code-scan sizing | ±25% |

### Sizing math (compute.mjs only)

- Three-point: `E = (O + 4M + P) / 6`, `σ = (P − O) / 6`; project buffer
  `= √(Σσ²)` — never a naive sum of worst cases.
- Factor-scored tiering: five 1–5 scores → total → tier via fixed breaks
  (≤10 S, 11–17 M, 18–25 L) → hour band from a calibration table. Tiers map
  to **hour bands** first, not straight to price, so rates + AI multipliers +
  scenarios apply on top.
- Calibration table (tier → hour band) is explicit data: asked once in the
  interview, stored, reused.
- Risk buffer: each listed risk gets probability × impact hours, summed as its
  own visible line — never hidden inside task estimates.
- Non-coding overhead: +30-40% on raw dev hours, explicit line item.

### AI layer (`ai-multipliers.md`)

| Task category | AI time reduction |
|---|---|
| Boilerplate / CRUD / tests / docs | 50-80% |
| Business logic, integrations | 20-40% |
| Architecture, novel algorithms, UX, stakeholder work | 0-10% |

Per task: `(AI-Optimistic + 2×AI-Realistic + Traditional) / 4`. Reduction
scaled by seniority (seniors gain relatively less). Verification overhead of
AI output added back (+10-15%). Claude plan prices live in a dated table in
`ai-multipliers.md`, updated manually — no runtime price research.

### Scenario engine

Input: team options (n engineers × seniority × rate) + Claude Code plan per
seat (none / Max 5x / Max 20x). Per scenario: effective capacity → duration
(with a parallelization ceiling — coordination tax per added person), cost =
labor + plan seats, risk notes (bus factor at 1 engineer, coordination
overhead at 4+). Output: comparison table + one recommended scenario with
rationale — e.g. "2 engineers + Claude Code Max 5x, 4.2 months".

### Confidence

Per row HIGH / MED / LOW derived from provenance + uncertainty score. Project
confidence = worst-of-critical-path, never an average.

## 4. Output files & contracts

```
estimation-inputs.json ──compute.mjs──► estimation.json ──┬──► estimation.md
      (agent judgments)                  (computed truth)  └──► estimate.html
```

| File | Written by | Content | Audience |
|---|---|---|---|
| `estimation-inputs.json` | agent | WBS, per-task judgments, AI categories, rates, risks, assumptions, provenance | machine (audit trail, re-runnable) |
| `estimation.json` | compute.mjs | all computed values + inputs echoed | machine (feeds page + re-render) |
| `estimation.md` | agent (from json) | human doc, two parts | people |
| `estimate.html` | render step | template + embedded estimation.json, self-contained | browser |

### estimation.md structure

```
## Summary (client-facing)
scope table (feature · tier · range · timeline) — sums at feature level
recommended delivery: team + AI plan + duration + cost range
assumptions register (impact if wrong)
risks + visible buffer
out of scope — explicit list

## Estimation detail (internal)
task table: task · category · O/M/P · AI-adjusted E · confidence · assumptions · src
technique used + why
scenario comparison table
calibration data used
```

The summary reads standalone for proposals. Rates appear only in the detail
part; the interview asks whether the client view exposes rates.

### validate.mjs contract rules

- Every detail row: confidence + assumptions + `src` provenance column
  (arch-docs vocabulary).
- `not estimated`, never `0`.
- Every scope item labeled `stated` or `proposed`.
- Assumptions register non-empty.
- Ranges ordered low < mid < high; buffer line present.
- Totals in `estimation.json` recomputed by validate.mjs must match the file
  (catches hand-edits).

### Placement

Companion mode: beside ARCHITECTURE.md in the target project's docs dir.
Standalone: `docs/estimate/`.

## 5. Interactive page (`estimate-template.html`)

Single self-contained file using the arch-docs viewer's visual language
(fonts, palette, theme toggle).

Layout: header (project · date · confidence badge · internal/client toggle);
scenario cards (duration + cost per scenario, recommended one marked); what-if
controls (engineer count, seniority mix, Claude plan, hourly rate, AI
multiplier, risk buffer, overhead %, reset-to-recommended); cost/time stacked
bars per feature incl. buffer + overhead segments; timeline bars with
low↔high range whiskers; feature table with expandable task rows (internal
view only); assumptions & risks register.

Mechanics:

- `estimation.json` embedded as `<script type="application/json">` — zero
  fetch, works over serve.mjs or `file://`.
- Controls recompute in browser JS. Formulas live once in
  `scripts/lib/estimate-math.mjs`, imported by compute.mjs and inlined into
  the template at render — one source, no drift.
- Edited state is exploration only; banner "modified from committed estimate —
  reset?". Nothing writes back.
- Client view toggle hides task rows, rates, multiplier controls; a
  `--client-only` render flag strips the internal view entirely for files sent
  to clients.
- No chart libraries: bars and timeline are styled divs — self-contained,
  printable.
- Both themes; confidence colors (green/amber/red) consistent across cards,
  rows, badge.

Not in v1: persisted slider state, multi-project comparison, PDF export
(print CSS suffices), editing the WBS in the browser.

## 6. Testing, validation, rename migration

### Tests (TDD, mirroring arch-docs `scripts/test/`)

| Layer | Test | Verifies |
|---|---|---|
| `estimate-math.mjs` | unit, fixture in/out | PERT, √Σσ² buffer, tier breaks, AI formula, scenario rollup — golden numbers hand-computed |
| `compute.mjs` | fixture inputs → snapshot output | determinism: same input, byte-same output |
| `validate.mjs` | pass + fail fixtures | each contract rule rejects its violation |
| `estimate-template` | browser-driven (same harness as viewer-template.test.mjs) | sliders recompute, client toggle hides internals, theme toggle, reset |
| render | integration | JSON embedded, page opens standalone, `--client-only` strips internal view |

Critical invariant: **browser math == node math** — same params through both,
assert equal. Guards the one-source-inlined-twice design.

### Rename migration (`arch-docs` → `solution-architect`)

1. `git mv plugins/arch-docs plugins/solution-architect`
2. Update plugin manifest name + marketplace entry.
3. Sweep plugin-path references in docs/tests (`rg "arch-docs"`); the skill
   name `arch-docs` itself stays.
4. arch-docs tests must pass unmodified after the move — the regression gate
   for the rename.

### Non-goals (v1)

- Actuals tracking / estimate-vs-actual feedback loop (future calibration input).
- `viewer-template.html` integration (approach B — possible later promotion).
- Monte Carlo simulation.
- Runtime web research for pricing (dated reference table instead).
