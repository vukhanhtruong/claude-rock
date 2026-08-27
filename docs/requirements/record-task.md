# Product Requirements Document: Record-Task Skill — Automatic Measurement Capture

Status: **deferred** — designed alongside the measurement-based estimation work
(see `measurement-based-estimation.md`), implementation postponed. This PRD
freezes the decisions made during that design session so implementation can
start later without re-litigating them.

---

## 1. Product Summary

Build a **`record-task` agent skill that captures actual execution time of
agentic coding tasks automatically**, appending one measurement per completed
task to the global historical dataset (`~/.agents-rock/measurements.jsonl`)
that the `estimate` skill reads for measurement-based estimation.

Core decision made during design: capture must be **built around gates
(Claude Code hooks), not human invocation**. Humans forget to record;
a dataset that depends on memory stays too sparse to calibrate anything.

---

## 2. Problem

The measurement-based estimation loop (estimate → execute → measure → store →
calibrate) is only as good as its dataset. Manual recording has two failure
modes:

1. **Forgetting** — nobody records after every task; the dataset starves.
2. **Recall error** — "that took about 20 minutes" recorded hours later is a
   guess, not a measurement.

A hook knows timestamps precisely and fires every time. It cannot, however,
know what a "task" is, what shape it was, or how many corrections it took.

---

## 3. Objective

Split the work by who is good at it:

```text
capture   (dumb, automatic)  → hooks: timestamps, repo, session, model
classify  (smart, automatic) → Claude in-session: task shape, corrections
persist   (dumb, validated)  → record.mjs: append-only writer
```

No human step in the primary path. Manual invocation survives only as a
fallback.

---

## 4. Architecture

```text
Claude Code hooks (shipped by the plugin)
│
├── UserPromptSubmit hook
│     stamps t0 + prompt text → staging file
│     (~/.agents-rock/staging/<session-id>.jsonl — raw telemetry,
│      NOT measurements)
│
├── PostToolUse hook on Bash(git commit)     ← task boundary
│     computes elapsed since t0
│     captures repo, branch, agent, model, session id
│     writes a DRAFT measurement to staging
│     hook additionalContext instructs Claude: "classify shape + finalize"
│
└── Claude (in-session, no human)
      classifies task shape from the work it just performed
      fills correction_cycles / test_cycles (it knows them)
      calls scripts/record.mjs → validated line appended to
      ~/.agents-rock/measurements.jsonl
```

### Task boundary = git commit

A commit is the natural "task done" gate in an agentic workflow. Elapsed
wall-clock from task start to commit includes review and corrections, which
matches the `actual_minutes` definition used by the estimation skill (full
cycle time, human review included).

Multi-commit tasks: the hook stages each commit's draft; Claude merges drafts
into one measurement for the task it is aware of, at the final commit.

### What a hook must never do

- Classify shape (it cannot know).
- Write directly to `measurements.jsonl` (only `record.mjs` writes there).
- Block or slow the commit (capture is fire-and-forget).

---

## 5. Skill Layout

```text
plugins/solution-architect/skills/record-task/
├── SKILL.md                     # triggers + first-run hook setup flow
├── references/recording.md      # field guidance, what counts as one task
└── scripts/
    ├── record.mjs               # validate + append one line (append-only)
    ├── report.mjs               # calibration report (terminal markdown)
    └── hooks/
        ├── prompt-start.mjs     # UserPromptSubmit capture
        └── commit-boundary.mjs  # PostToolUse(git commit) capture

plugins/solution-architect/hooks/hooks.json   # plugin-level hook registration
```

Shared with the estimate skill: `lib/measurements.mjs` — one module owning
the measurement schema, shape taxonomy validation, and jsonl read/append, so
the two skills can never drift apart on the data contract.

---

## 6. Install Paths

| Install path | Hooks active? | Mechanism |
| --- | --- | --- |
| Plugin enabled in Claude Code | Yes, automatic | `hooks/hooks.json` inside the plugin; registered on enable, removed on disable. settings.json never edited. Scripts resolve via `${CLAUDE_PLUGIN_ROOT}`. |
| Standalone skill copy (agents-rock CLI symlink, other agents) | No | Skills are passive; nothing runs at install time. |

**Standalone fallback — first-run setup:** on first invocation the skill
detects missing hooks and offers to install them into the user's
settings.json. The edit happens only with explicit user approval, never
silently. If declined, the skill operates in manual mode.

---

## 7. Manual Fallback

Kept for: agents without these hooks (Cursor, Codex, ...), missed sessions,
and corrections (which are new appended lines, never edits).

```text
User:  record that — the payment refactor took 25 minutes
Skill: Shape: cross_file_refactor? (guessed)        → yes
       Corrections?                                  → 1
       Agent/model: claude-code + sonnet? (session)  → yes
       Estimated beforehand?                         → 22 min
       ✓ recorded
```

Only fields that cannot be inferred are asked; repo defaults from cwd git,
agent/model from session context. Target: 2–3 confirmations, ~30 seconds.

---

## 8. Data Contract

Same record shape as `measurement-based-estimation.md` §9. Minimum:

```yaml
task_id:            # stamped by record.mjs
task_description:
task_shape:         # from the shared taxonomy (extensible; unknown = warn)
repository:
agent:
model:
actual_minutes:     # wall-clock, review included
created_at:         # stamped by record.mjs
```

Preferred additions: `estimated_minutes`, `correction_cycles`, `test_cycles`,
`success`, `risks_encountered`, and the split durations
(`ai_execution_minutes`, `review_minutes`) for future bottleneck analysis.

Guardrails (inherited from the estimation PRD §17):

- Append-only. No edit or delete of recorded lines, ever.
- `record.mjs` validates every field before appending; a bad draft is
  rejected with a reason, not silently coerced.

---

## 9. Calibration Report

`report.mjs`, invoked by "how accurate are my estimates". Terminal markdown
only (no HTML — a dashboard is future work). Per task shape:

```text
samples · median actual · median error % · P80 error ·
estimate/actual ratio · trend over last N
```

Error math per estimation PRD §14: `|estimated − actual| / actual × 100`.

---

## 10. MVP Scope

Build:

- Plugin-level hooks (UserPromptSubmit, PostToolUse on git commit)
- Staging file + draft measurement flow
- In-session classification + `record.mjs` append
- Manual fallback flow
- First-run hook setup for standalone installs
- `report.mjs` basic calibration report
- Shared `lib/measurements.mjs` (may land earlier with the estimate work)

Do not build:

- Git shell hooks (post-commit) for non-Claude agents — widens coverage but
  cannot classify; revisit after MVP
- CI/CD or issue-tracker integration
- HTML dashboards
- Automatic bottleneck analysis

---

## 11. Success Criteria

- A task completed in a hooked Claude Code session produces exactly one
  valid measurement line with zero human interaction.
- Commit latency added by hooks is imperceptible (<100 ms).
- Manual fallback records a task in under a minute.
- `measurements.jsonl` lines written by this skill validate against the same
  schema `estimate`'s baseline retrieval reads.
- Duplicate protection: re-running finalization for an already-recorded
  task_id is a no-op, not a second line.

---

## 12. Build Notes

- Implement via `/skill-creator:skill-creator` (authoring + evals), per the
  design session decision.
- The estimate skill ships first and reads an empty dataset gracefully
  (everything Uncalibrated); this skill is what fills the dataset.
