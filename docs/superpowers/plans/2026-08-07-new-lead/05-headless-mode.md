# Milestone 05 — Orchestrated (Headless) Mode for the Three Skills

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Read `00-overview.md` Global Constraints first.

**Goal:** Each existing skill gains one **appended** "Orchestrated mode" section, triggered only by an answers-file input. Standalone invocations behave byte-for-byte as today.

**Hard rule for every task here: additive only.** The diff for each SKILL.md must consist of appended lines at the end of the file — zero modified, zero deleted lines. Verify with `git diff --stat` (only insertions) and `git diff` (no `-` lines other than the trailing-newline artifact, which must also be avoided: append starting with a blank line).

No automated tests exist for skill prose — the verification steps are the test.

---

### Task 1: arch-docs orchestrated mode

**Files:**
- Modify (append only): `plugins/solution-architect/skills/arch-docs/SKILL.md`

**Interfaces:**
- Consumes: `new-lead-answers.json` (schema defined in milestone 06; this section names only the fields it reads).
- Produces: the contract workflow agents rely on in milestone 06's ARCH workflow.

- [ ] **Step 1: Append exactly this section** (after the `## Dependency` section):

```markdown
## Orchestrated mode

Active only when the caller provides a path to a `new-lead-answers.json`
file. Without that file this section does not apply — run the flow above
unchanged.

- Skip step 3 (Interview): read the interview's outputs from the answers
  file instead — project type and mode from `lead` + `evidence`, scope from
  `scope`, stack/hosting/compliance from `tech`, constraints from
  `delivery`. A question the answers file does not cover is an honest
  absence — render it as one (hard rule 3), never invent an answer.
- Skip every user confirmation: mode-detection override (step 1) and
  dropped-research surfacing (step 4) are logged to a `decisions` list in
  your final report instead of asked.
- Skip step 7 (Render + serve) entirely — the orchestrator owns rendering.
- Everything else — hard rules 1–5, scanning, research, writing,
  `validate.mjs` until exit 0 — applies unchanged.
- Report back (as your final structured output, not prose): files written,
  final validate exit code, `decisions[]`.
```

- [ ] **Step 2: Verify additive-only** — `git diff plugins/solution-architect/skills/arch-docs/SKILL.md` shows only `+` lines appended after the existing last line; the file's prior content is untouched.

- [ ] **Step 3: Standalone sanity read** — re-read the full SKILL.md top to bottom: the new section is unreachable without an answers file; no earlier step references it.

- [ ] **Step 4: Commit** — `git commit -m "feat(arch-docs): add orchestrated mode for /new-lead"`

---

### Task 2: estimate orchestrated mode

**Files:**
- Modify (append only): `plugins/solution-architect/skills/estimate/SKILL.md`

- [ ] **Step 1: Append exactly this section** (after `## Dependency`):

```markdown
## Orchestrated mode

Active only when the caller provides a path to a `new-lead-answers.json`
file. Without that file this section does not apply — run the flow above
unchanged.

- Skip steps 1–3 (evidence detection, depth ask, interview): evidence
  findings come from `evidence`, depth from `delivery.depth`
  (QUICK/STANDARD/DEEP), scope and the clear-vs-assumed split from `scope`
  (`mustHave`/`niceToHave` are stated, `assumed` items are proposed). A
  hole the answers file does not fill stays a hole — label it `proposed`
  with its assumption, never silently resolve it.
- Step 4 (Technique): the technique was already recommended and confirmed
  during the combined interview — take it from `delivery.technique` and log
  it to `decisions` instead of re-confirming.
- Skip step 9 (Render + serve) — the orchestrator owns rendering.
- Companion mode applies as written when ARCHITECTURE.md exists (it will,
  under the orchestrator — it runs after the arch gate).
- Everything else — hard rules 1–5, sizing, `compute.mjs`, writing,
  `validate.mjs` until exit 0 — applies unchanged.
- Report back: files written, final validate exit code, `decisions[]`.
```

- [ ] **Step 2: Verify additive-only** — same `git diff` check as Task 1.
- [ ] **Step 3: Standalone sanity read** — section unreachable without answers file.
- [ ] **Step 4: Commit** — `git commit -m "feat(estimate): add orchestrated mode for /new-lead"`

---

### Task 3: proposal orchestrated mode

**Files:**
- Modify (append only): `plugins/solution-architect/skills/proposal/SKILL.md`

- [ ] **Step 1: Append exactly this section** (after `## Dependency`):

```markdown
## Orchestrated mode

Active only when the caller provides a path to a `new-lead-answers.json`
file. Without that file this section does not apply — run the flow above
unchanged.

- Skip step 2 (Interview): client context and tech level come from
  `client`, validity and firm profile (with storage scope) from `proposal`,
  and the scenario pick from `proposal.scenario` — the orchestrator sets it
  at the estimate gate before this skill runs. No scenario in the file →
  stop and report; never pick one yourself.
- Step 6 (Fresh-eyes review) is run by the orchestrator's workflow — when
  invoked as the writer agent inside it, write and validate, then stop
  after step 5; the review, fix, and re-validate stages happen as separate
  agents.
- Step 7 (Human review) is owned by the orchestrator's proposal gate — do
  not wait for approval yourself; report and stop.
- Skip steps 8–9 (Render, serve) — the orchestrator owns rendering.
- Everything else — hard rules 1–4, the prereq gate, `derive.mjs` as the
  only source of numbers, `validate.mjs` until exit 0 — applies unchanged.
  Hard rule 5 is satisfied by the orchestrator's gate, not skipped.
- Report back: files written, final validate exit code, `decisions[]`.
```

- [ ] **Step 2: Verify additive-only** — same `git diff` check.
- [ ] **Step 3: Standalone sanity read** — hard rule 5 (human review) still binding for standalone runs; orchestrated mode reassigns it to the gate, never removes it.
- [ ] **Step 4: Commit** — `git commit -m "feat(proposal): add orchestrated mode for /new-lead"`

---

**Milestone exit criteria:** three commits, each diff pure-append; a standalone read of each skill shows unchanged behavior without an answers file.
