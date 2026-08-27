# Agentic Estimation — Design Spec

Date: 2026-08-27
Source requirements: `docs/requirements/measurement-based-estimation.md`
Deferred sibling: `docs/requirements/record-task.md` (automatic measurement
capture — designed, implementation postponed)

## Summary

Extend the `estimate` skill (`plugins/solution-architect/skills/estimate/`)
with a second estimation family: **measurement-based estimation for agentic
delivery**. When the user declares in the interview that AI coding agents
execute the work, task durations come from measured historical execution
data instead of PERT judgment + AI multipliers. Both families end in the
same deliverable pipeline: `estimation-inputs.json → compute.mjs →
estimation.json → estimation.md → validated interactive HTML page`.

## Decisions (approved in design session)

| # | Decision |
| --- | --- |
| D1 | Agentic mode produces the full existing deliverable (WBS, scenarios, pricing, HTML page) — only the duration math changes. |
| D2 | Historical data lives in one global file: `~/.agents-rock/measurements.jsonl`. Per-record `repository` field enables per-repo preference with cross-project fallback. |
| D3 | Delivery mode is binary: TRADITIONAL (humans code — technique menu as today) vs AGENTIC (AI codes — measurement-based). The AI-multiplier model is no longer a selectable mode; it survives only as the seed formula for uncalibrated shapes. |
| D4 | Baseline retrieval, statistics, and confidence are computed by scripts, never by the agent. The agent judges decomposition, shape classification, and seeds only. |
| D5 | Per-task `model` override (project default in `agentContext`) — plan-with-frontier / code-with-cheaper workflows match each task against its own model's history. |
| D6 | `planning` is a first-class task shape; agentic decompositions must include human-side operations (planning, final review passes) as explicit tasks. |
| D7 | Duration math uses a lognormal fit from measured percentiles (see Math). Task expected values are lognormal means (means sum; medians do not). |
| D8 | Separate HTML template for agentic mode (`estimate-template-agentic.html`); team template untouched. `render.mjs` routes by `deliveryMode`. Accepted tradeoff: shared styling fixes may need mirroring. |
| D9 | Recording of actuals is the deferred `record-task` skill (hook-gated, automatic). The estimate skill ships reading a possibly-empty dataset: everything renders Uncalibrated until data exists. |
| D10 | New-skill work goes through `/skill-creator:skill-creator` with evals (applies to record-task when built; estimate changes follow the existing repo test conventions). |

## 1. Delivery-mode fork

### Interview (`references/interview.md`)

New question immediately after Depth:

```text
Delivery mode?
 ├── TRADITIONAL — humans code            → technique menu as today
 └── AGENTIC     — AI coding agents code  → measurement-based
```

Agentic follow-ups (replace AI-category scoring and the technique question):

- Agent + model executing the work (e.g. claude-code + sonnet); sub-question:
  same model for planning, or different?
- Per task: task shape + scope attributes (affected files, complexity
  low/med/high) + seed minutes (o/m/p) for the no-baseline case.

Everything else survives unchanged: evidence detection, clear-vs-assumed
gate, milestones, team/rates (humans still review and steer), deadline,
calibration table (traditional only), expose-rates.

### Schema (`estimation-inputs.json`, enforced by `lib/schema.mjs`)

```jsonc
{
  "deliveryMode": "agentic",            // absent or "traditional" = current behavior
  "agentContext": { "agent": "claude-code", "model": "sonnet" },
  "measurementsPath": "~/.agents-rock/measurements.jsonl",  // optional override (tests)
  "features": [{ "tasks": [{
      "id": "t1",
      "shape": "cross_file_refactor",   // agentic replaces "category"
      "scope": { "affectedFiles": 8, "complexity": "low" },
      "seedMinutes": { "o": 10, "m": 20, "p": 45 },
      "model": "opus",                  // optional per-task override
      "assumptions": [], "provenance": "proposed"
  }]}]
}
```

Agentic task rules: require `shape`, `scope`, `seedMinutes` (o ≤ m ≤ p, all
> 0); reject `category`; reject any hand-written duration or confidence —
those fields do not exist in inputs; the script writes them into
`estimation.json`. Top level: `agentContext.agent`/`.model` required in
agentic mode. Team-mode inputs validate exactly as today (backward
compatible).

## 2. Task shapes, store, retrieval

### Shapes (`references/task-shapes.md`, new)

13 shapes: the 12 from the requirements PRD §7 (`scaffold`,
`small_implementation`, `cross_file_refactor`, `test_creation`, `bug_fix`,
`configuration`, `api_integration`, `database_change`, `documentation`,
`ui_implementation`, `migration`, `investigation`) plus **`planning`**
(produce plan/design/decomposition before code). Each entry: definition,
examples, which scope attributes matter. Extensible: an unknown shape in a
measurement warns but is kept.

### Store

`~/.agents-rock/measurements.jsonl` — append-only, one JSON object per
completed task (fields per requirements PRD §9). Missing file = zero
samples, never an error. Read/parse/validate lives in a shared
`lib/measurements.mjs` (also the future write path for record-task).
Corrupt lines are skipped with a warning, never fatal.

### Retrieval ladder (`lib/baselines.mjs`, new, dependency-free)

Per task, filter measurements top-down; stop at the first rung with ≥3
samples:

```text
1. shape + repository + agent + model
2. shape + agent
3. shape + similar scope (affectedFiles within ±50%)
4. shape alone (global)
5. no match → UNCALIBRATED (use seedMinutes)
```

Each task matches against its own effective model (task override else
`agentContext`). Output per task:

```text
matchBaseline(task, measurements) →
  { minutes, samples, matchLevel, confidence, evidence[] }
```

`evidence[]` = the actual matched records (id, description, actual minutes)
so the deliverable prints real history and the agent never touches raw data.

### Confidence (requirements PRD §12)

| Samples | Variance | Confidence |
| --- | --- | --- |
| ≥10 | low (p80/p50 < 2) | HIGH |
| ≥10 | high | MED |
| 3–9 | any | MED |
| 1–2 | any | LOW |
| 0 | — | UNCALIBRATED |

## 3. Math

All in `lib/baselines.mjs`; deterministic; constants documented in the
reference doc's Sources with "tune against real data".

```text
n ≥ 5 samples:
  σ_log  = ln(p95 / p50) / 1.645     # lognormal fit from percentiles
  e      = p50 · exp(σ_log² / 2)     # lognormal MEAN — means sum, medians don't
  σ_task = e · √(exp(σ_log²) − 1)    # lognormal sd

1 ≤ n < 5 (matched, but too few points to fit percentiles):
  e      = median(matched actual_minutes)
  σ      = seed-derived: (seed p − seed o) / 6

n = 0:
  e, σ from seedMinutes via existing pert()   # UNCALIBRATED
```

- Hours conversion: minutes / 60 at the rollup boundary.
- `actual_minutes` is full-cycle wall clock (AI execution + corrections +
  tests + human review), so agentic mode does **not** apply
  `verificationPct` — review is already inside the baseline.
- Buffers: existing `projectBuffer(√Σσ²)` unchanged, fed the σ above.
- Risks: same `risks` array; agentic entries use `impactMinutes` (script
  converts). Every risk requires probability + impact + reason; generic
  contingency remains banned.
- Scenarios: `taskHours` are identical across scenarios in agentic mode
  (duration is a property of the measured agent). Scenarios differ only in
  team cost, Claude plan cost, and calendar months from capacity. Seniority
  factor is not applied to agentic tasks.
- `estimation.json` gains per task: `{ minutes, samples, matchLevel,
  confidence, evidence[], calibrated }`.
- `criticalConfidence` gains rank `UNCALIBRATED` below LOW; one uncalibrated
  task on the critical feature stamps the project Uncalibrated.

Sources to cite in the new reference doc: Bernhardsson (lognormal task
durations, median-vs-mean, erikbern.com 2019); Vacanti, *Actionable Agile
Metrics for Predictability* (percentile cycle-time forecasting, non-normal
distributions); Atomic Object (buffer machinery, already cited); the
1.645 constant is the standard normal 95th-percentile z-score applied in
log space.

## 4. Validation and deliverable

### Enforcement (`lib/checks.mjs`, requirements PRD §18)

| Check | Catches |
| --- | --- |
| Vague-range patterns in estimation.md (`1–2 hours`, `a few hours`, `half a day`, `depending on complexity`) | hidden uncertainty |
| Every agentic task carries a confidence label; UNCALIBRATED never rendered as measured | fake calibration |
| Evidence rows in the md match `estimation.json` evidence (ids, minutes) | invented history |
| ≥1 `planning`-shaped task in every agentic decomposition | "agent typing time only" estimates |
| Risk entries carry probability + impactMinutes + reason | generic buffers |

Existing validate → render refusal chain unchanged.

### Deliverable

estimation.md (agentic additions, `references/writing.md`):

- Header: `Delivery: agentic (claude-code + sonnet) · Baselines: N
  measurements, K shapes`.
- Task table columns: baseline min · samples · match level · confidence.
- Evidence section: matched historical rows per shape.
- Calibration nudge when shapes lack data, pointing at record-task.

HTML: new `assets/estimate-template-agentic.html` (D8). Baseline-native
task table, first-class Evidence section, no AI-category slider or
seniority prose; team + plan sliders retained (they price review labor and
calendar). Its `renderMethod()` describes the measurement pipeline (shape
classification → match ladder → lognormal fit → buffers → confidence) with
the Sources above; all `help()` hints written agentic-native (risk register
says impact minutes). `render.mjs` routes by `deliveryMode`; `redact.mjs`
client-only render and the viewer back-link must work on both templates.

## 5. Recording actuals — deferred

The `record-task` skill (hook-gated automatic capture at the git-commit
boundary, manual fallback, calibration report) is specified in
`docs/requirements/record-task.md` and not built now. Consequences honored
here:

- The estimate skill reads a possibly-empty dataset gracefully — every
  shape Uncalibrated, seeded, labeled.
- `lib/measurements.mjs` is designed as the shared data-contract module the
  future skill will reuse.
- The agentic deliverable ends with the record-actuals nudge so the loop
  closes once record-task exists.

## 6. Testing

Node test runner, `scripts/test/` beside the existing suites (782 passing
baseline). TDD: tests first, red, then implement.

| Unit | Coverage |
| --- | --- |
| `lib/measurements.mjs` | schema validation; corrupt-line skip with warning; missing file → `[]` |
| `lib/baselines.mjs` | every ladder rung + fallthrough; per-task model override; percentiles; lognormal fit (fixture: p50=11, p95=30 → e≈13.2, σ≈8.8); confidence tiers incl. variance rule; evidence rows |
| `lib/schema.mjs` (agentic) | shape/scope/seedMinutes required; `category` rejected; hand-written durations rejected; agentContext required; team mode untouched |
| `lib/rollup.mjs` (agentic) | e/σ from baselines; minutes→hours; scenario-identical taskHours; UNCALIBRATED project rank |
| `lib/checks.mjs` | all five enforcement checks, positive and negative |
| render | template routing by deliveryMode; redact on agentic template; fixture snapshot |

Fixtures: `test/fixtures/measurements.jsonl` (~20 synthetic lines across
shapes/repos/models) + an agentic estimation-inputs fixture mirroring the
booking fixture. Deterministic: no clock, no network.

## Out of scope (this iteration)

- record-task skill (deferred, own PRD)
- ML prediction, dashboards, project-level forecasting, agent benchmarking,
  bottleneck analysis (requirements PRD §22/§24)
- Git shell hooks for non-Claude agents
