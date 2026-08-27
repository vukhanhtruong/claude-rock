# Product Requirements Document: Measurement-Based Estimation Skill for Agentic Workflows

## 1. Product Summary

Build an **agent skill that estimates implementation time using measured historical AI-assisted execution data**, rather than traditional human developer-hour assumptions.

The skill should estimate work based on:

> **Task decomposition → historical cycle-time baselines → explicit risks → execution measurement → continuous calibration**

The main goal is to produce increasingly accurate estimates for workflows where AI coding agents such as Claude Code, Codex, Cursor, or Copilot perform a significant portion of the implementation.

---

## 2. Problem

Traditional software estimation methods assume human coding throughput.

Examples:

- Story points
- T-shirt sizing
- Developer hours
- Planning poker
- Team velocity

Agentic coding changes the delivery model:

```text
Task
  ↓
AI implementation
  ↓
Human review
  ↓
Tests / validation
  ↓
AI correction
  ↓
Human approval
```

The coding step can become dramatically faster, making traditional estimates systematically inaccurate.

AI agents also tend to estimate using human-era assumptions learned from training data.

Example:

```text
AI Estimate: 2 hours
Actual Agentic Cycle: 12 minutes
```

The system therefore needs to estimate against **measured agentic workflow performance**.

---

# 3. Objective

Create a reusable skill that can:

1. Break work into measurable operations.
2. Classify each operation by **task shape**.
3. Retrieve historical execution baselines.
4. Produce a single evidence-based estimate.
5. Identify explicit risks separately from baseline work.
6. Record actual execution time.
7. Continuously improve future estimates using measured results.

---

# 4. Core Principle

The skill must follow:

```text
Estimate
   ↓
Execute
   ↓
Measure Actual
   ↓
Store Observation
   ↓
Update Baseline
   ↓
Better Estimate
   ↺
```

Estimation should use:

```text
Estimated Duration
=
Σ Historical Cycle Baselines
+
Explicit Risk Adjustments
```

It should **not** use:

```text
Traditional Developer Hours
×
AI Productivity Multiplier
```

---

# 5. Users

### Primary

- Software engineers using coding agents
- Technical leads
- Engineering managers

### Secondary

- Project managers
- Product owners
- Delivery managers

The output should remain understandable to non-technical stakeholders.

---

# 6. Main Use Cases

## UC1 — Estimate a coding task

User:

> Estimate the effort to replace the old API client with the new client across 8 files.

Skill:

1. Decomposes the task.
2. Identifies task shapes.
3. Retrieves similar historical executions.
4. Calculates estimate.
5. Adds specific risk adjustments.
6. Returns one estimated duration with evidence.

---

## UC2 — Estimate a feature

User:

> Estimate implementing password reset.

The skill decomposes the feature:

```text
API endpoint
Email integration
Token generation
UI form
Tests
Validation
```

Each operation is estimated separately.

---

## UC3 — Record actual execution

After completion:

```text
Estimated: 22 minutes
Actual: 27 minutes
```

The skill stores the observation and uses it for future calibration.

---

## UC4 — Estimate without historical data

If no relevant baseline exists, the skill must explicitly state:

> No calibrated baseline exists for this operation.

It may generate an initial estimate, but must mark it as **uncalibrated**.

---

# 7. Task Shape Model

The system should classify tasks into reusable categories.

Initial categories may include:

| Task Shape           | Example                                      |
| -------------------- | -------------------------------------------- |
| Scaffold             | Create new module or service                 |
| Small implementation | Add isolated business logic                  |
| Cross-file refactor  | Replace pattern across multiple files        |
| Test creation        | Add unit/integration tests                   |
| Bug fix              | Diagnose and correct known issue             |
| Configuration        | Modify environment/configuration             |
| API integration      | Add or modify external API                   |
| Database change      | Schema or query modification                 |
| Documentation        | Generate/update technical documentation      |
| UI implementation    | Create or modify frontend component          |
| Migration            | Replace technology or implementation pattern |
| Investigation        | Explore unknown system behavior              |

Task shapes should be extensible.

---

# 8. Required Inputs

Minimum input:

```yaml
task_description: string
```

Optional inputs:

```yaml
repository_context: string
affected_files: number
task_type: string
agent: string
model: string
environment: string
known_dependencies: list
known_risks: list
```

Example:

```yaml
task_description: Replace legacy API client with new SDK
affected_files: 8
agent: Claude Code
model: Claude Sonnet
known_risks:
  - SDK compatibility
  - Integration tests may require updates
```

---

# 9. Historical Measurement Data

Each completed execution should store:

```yaml
task_id:
task_description:
task_shape:
repository:
agent:
model:
operations:
estimated_duration:
actual_duration:
review_duration:
correction_cycles:
test_cycles:
success:
risks_encountered:
created_at:
```

Example:

```yaml
task_shape: cross_file_refactor
agent: claude-code
affected_files: 10
estimated_duration_minutes: 12
actual_duration_minutes: 9
correction_cycles: 1
test_cycles: 1
success: true
```

---

# 10. Estimation Workflow

## Step 1 — Decompose the task

The skill MUST convert broad tasks into discrete operations.

Bad:

```text
Implement authentication.
```

Good:

```text
1. Add authentication middleware
2. Add login endpoint
3. Add token validation
4. Create login UI
5. Add tests
6. Run validation suite
```

---

## Step 2 — Classify task shapes

Each operation receives:

```yaml
task_shape:
complexity_attributes:
affected_scope:
```

Example:

```yaml
task_shape: cross_file_refactor
affected_files: 8
pattern_complexity: low
```

---

## Step 3 — Retrieve historical baselines

Search historical executions using:

1. Task shape
2. Repository or technology
3. Agent/model
4. Scope
5. Complexity
6. Similar operations

Prefer measured observations over model-generated assumptions.

---

## Step 4 — Calculate baseline

Recommended initial calculation:

```text
Baseline = median(actual duration of similar tasks)
```

Prefer median over average to reduce distortion from outliers.

When enough data exists, also calculate:

```text
P50
P80
P95
```

Example:

```text
Historical tasks: 14

P50: 8 minutes
P80: 11 minutes
P95: 17 minutes
```

---

## Step 5 — Identify explicit risks

Generic buffers are prohibited.

Bad:

```text
+30 minutes contingency
```

Good:

```text
+5 minutes if integration tests require SDK mocks to change.
```

Each risk must contain:

```yaml
risk:
probability:
time_impact:
reason:
```

---

## Step 6 — Produce one estimate

Primary output:

```text
Estimated duration: 24 minutes
```

The skill may additionally provide confidence information:

```text
Confidence: Medium
Historical samples: 8
```

Avoid vague estimates such as:

```text
1–3 hours depending on complexity.
```

---

# 11. Required Output Format

```markdown
## Estimate

**Estimated duration:** 24 minutes  
**Confidence:** Medium  
**Historical samples:** 8

### Breakdown

| Operation         | Baseline |
| ----------------- | -------: |
| Modify API client |    8 min |
| Update 8 usages   |    7 min |
| Update tests      |    5 min |
| Run validation    |    4 min |

### Risks

- +5 min if SDK incompatibility requires changes.

### Evidence

Similar historical tasks:

- Refactor A — 19 min
- Refactor B — 21 min
- Refactor C — 23 min
```

---

# 12. Confidence Model

Confidence should depend on historical evidence.

### High

- ≥10 highly similar completed tasks
- Low historical variance

### Medium

- 3–9 similar observations
- Moderate variance

### Low

- <3 relevant observations
- Significant unknowns

### Uncalibrated

- No historical observations

Example:

```text
Estimate: 35 minutes
Confidence: Uncalibrated

Reason:
No measured historical baseline exists for this task shape.
```

---

# 13. Post-Execution Measurement

After work completes, the skill should capture:

```text
Start time
End time
Actual duration
Number of AI execution cycles
Number of corrections
Human review time
Test failures
Unexpected risks
```

Minimum required measurement:

```yaml
actual_duration:
```

Preferred:

```yaml
ai_execution_duration:
human_review_duration:
validation_duration:
correction_duration:
```

This enables future analysis of bottlenecks.

---

# 14. Calibration Metrics

The skill should track estimation performance.

## Estimation Error

```text
Error % =
|Estimated - Actual|
/
Actual
× 100
```

Example:

```text
Estimate: 20 min
Actual: 25 min

Error = 20%
```

---

## Key Metrics

Track:

```text
Median estimation error
P80 estimation error
Estimate / actual ratio
Number of calibrated task shapes
Historical observations per task shape
Agent/model throughput
Human review time
Correction cycles
```

---

# 15. Agent / Model Awareness

Historical baselines should distinguish execution environments.

For example:

```text
Claude Code + Model A
Cursor + Model B
Codex + Model C
```

Different agents or models may have different throughput.

Therefore:

```text
Task Shape
+
Repository
+
Agent
+
Model
+
Scope
=
Calibration Context
```

The system should fall back to broader data when exact matches are unavailable.

---

# 16. Baseline Retrieval Hierarchy

Search historical data in this order:

```text
Same task shape
+ Same repository
+ Same agent/model
        ↓
Same task shape
+ Same technology
+ Same agent
        ↓
Same task shape
+ Similar scope
        ↓
Global task-shape baseline
        ↓
No baseline → Uncalibrated estimate
```

---

# 17. Guardrails

The skill MUST NOT:

- Invent historical measurements.
- Present uncalibrated estimates as measured facts.
- Add arbitrary safety buffers.
- Estimate purely from traditional developer-hour conventions.
- Hide uncertainty behind broad time ranges.
- modify historical actuals after they are recorded.

The skill MUST:

- Distinguish measured data from assumptions.
- Explain missing baselines.
- Show estimation math.
- Record actual execution results.
- Use historical measurements whenever available.

---

# 18. Enforcement

Prompt instructions alone should not enforce estimation discipline.

A validator/hook should inspect estimates before returning them.

Detect patterns such as:

```text
5–10 minutes
1–2 hours
half a day
a few hours
depending on complexity
```

If detected, require the estimator to:

1. Re-check historical baselines.
2. Produce a primary estimate.
3. Provide explicit risk adjustments.
4. Mark missing evidence.

```text
Estimator Agent
      ↓
Estimation Validator
      ↓
Valid?
 ┌────┴────┐
No         Yes
↓           ↓
Recalculate Return
```

---

# 19. Suggested Skill Architecture

```text
User Task
    ↓
┌─────────────────────────┐
│ Estimation Skill        │
├─────────────────────────┤
│ 1. Task Decomposer      │
│ 2. Task Shape Classifier│
│ 3. Baseline Retriever   │
│ 4. Estimate Calculator  │
│ 5. Risk Analyzer        │
└────────────┬────────────┘
             ↓
      Estimate Validator
             ↓
       Final Estimate
             ↓
       Agent Execution
             ↓
     Measurement Recorder
             ↓
   Historical Dataset
             ↺
```

---

# 20. Suggested Skill Files

If implemented as a Claude/agent skill:

```text
measurement-estimation/
│
├── SKILL.md
│
├── references/
│   ├── task-shapes.md
│   ├── estimation-rules.md
│   └── confidence-model.md
│
├── scripts/
│   ├── retrieve_baseline.py
│   ├── calculate_estimate.py
│   ├── record_actual.py
│   └── validate_estimate.py
│
└── data/
    └── measurements.jsonl
```

For a POC, `measurements.jsonl` is sufficient.

A production implementation should move measurements into a database or telemetry system.

---

# 21. Example Dataset

```json
{
  "task_shape": "cross_file_refactor",
  "repository": "project-a",
  "agent": "claude-code",
  "model": "sonnet",
  "affected_files": 9,
  "actual_minutes": 11,
  "correction_cycles": 1
}
```

```json
{
  "task_shape": "cross_file_refactor",
  "repository": "project-a",
  "agent": "claude-code",
  "model": "sonnet",
  "affected_files": 7,
  "actual_minutes": 8,
  "correction_cycles": 0
}
```

Over time this becomes the organization's **agentic engineering throughput dataset**.

---

# 22. MVP Scope

The first version should support:

- Task decomposition
- Task-shape classification
- Local historical dataset
- Similar-baseline retrieval
- Median-based estimation
- Explicit risk adjustments
- Confidence classification
- Estimate validation
- Actual-duration logging
- Basic estimation accuracy metrics

Do not initially build:

- ML prediction models
- Complex dashboards
- Automatic project-level forecasting
- Cross-company benchmarks
- Automatic developer performance comparisons

---

# 23. MVP Success Criteria

The POC is successful when:

### Functional

- ≥5 task shapes are supported.
- Historical measurements can be recorded automatically or manually.
- Every estimate displays its supporting baseline.
- Missing baselines are clearly identified.
- Estimates are automatically validated against estimation rules.

### Quality

After at least **30 measured agentic tasks**:

```text
Median estimation error ≤ 30%
```

Stretch goal:

```text
Median estimation error ≤ 20%
```

The system should also demonstrate decreasing estimation error as the dataset grows.

---

# 24. Future Extensions

## Project-Level Forecasting

Combine multiple task estimates:

```text
Feature
 ├── API
 ├── Database
 ├── UI
 ├── Tests
 └── Validation
```

while accounting for dependencies and parallel execution.

---

## Agent Benchmarking

Compare:

```text
Claude Code
vs
Codex
vs
Cursor
```

for equivalent task shapes.

The purpose should be **workflow optimization**, not individual developer evaluation.

---

## Bottleneck Detection

Determine where time is actually spent:

```text
AI generation      8%
Human review      35%
Testing           22%
Corrections       15%
Waiting / tooling 20%
```

This moves the product beyond estimation toward **agentic workflow optimization**.

---

## Automatic Measurement

Integrate with:

- Git
- CI/CD
- coding-agent hooks
- issue trackers
- orchestration systems

to automatically capture execution cycles.

---

# 25. Product Vision

The long-term product is not simply an AI that gives better estimates.

It becomes an **observability and calibration layer for agentic software delivery**.

```text
Agent Work
     ↓
Measurement
     ↓
Historical Dataset
     ↓
Estimation
     ↓
Execution
     ↓
Measurement
     ↺
```

As traditional engineering teams built velocity models around human throughput, agentic engineering teams will need equivalent models around **AI + human workflow throughput**.

The skill provides the first layer of that capability.
