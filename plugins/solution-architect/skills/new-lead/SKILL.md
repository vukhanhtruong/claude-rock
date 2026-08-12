---
name: new-lead
description: Orchestrate a new pre-sales lead end-to-end — one combined interview, then architecture docs, estimate, and proposal produced by parallel-agent workflows with a human gate per document — plus a leads dashboard. Use when the user says "new lead", wants all three solution-architect documents for a client, or asks to manage/see their leads pipeline.
---

# new-lead

Take a pre-sales lead from evidence-in-hand to three approved, rendered
documents — `ARCHITECTURE.md`, `estimation.md`, `proposal.md` — by running
one combined interview and then launching the `analyze-requirements`, `estimate`, and
`proposal` skills as headless Workflows, with a human gate before each
document's rendered page ships. Also maintains the leads dashboard: a
persistent `leads.json` registry and a self-contained local server.

## Hard rules

1. One gate per document — no document advances to the next phase without
   explicit user approval.
2. Workflows never talk to the user — anything interactive (the interview,
   gate verdicts, the scenario pick) happens in this flow, before or between
   workflows, never inside one.
3. Generation truth is `new-lead-answers.json` (schema:
   `references/answers-schema.md`). `leads.json` is registry-only —
   business metadata for the dashboard — and is touched exclusively via
   `scripts/lead-upsert.mjs`, never by a direct write.
4. A failed workflow is reported, then resumed with `resumeFromRunId` —
   never silently rerun from scratch.
5. Rendering happens per phase, at that phase's gate, and is orchestrator-owned
   — no workflow renders or serves anything itself.

## Flow

1. **Root discovery**: walk up from the working directory for `leads.json`
   (the same discovery `scripts/lib/registry.mjs`'s `findLeadsRoot` uses).
   Not found → confirm with the user, then run
   `node scripts/init-root.mjs --root <dir>` at cwd (creates `leads.json`,
   copies `serve.mjs`, the registry libs, and `assets/dashboard/*` into the
   root), and offer `git init`.
2. **Evidence scan**: list the files the user gave or that are present in
   the target directory; classify each as `rfp`/`notes`/`codebase`/`none`;
   summarize into `evidence.sources[]`.
3. **Combined interview**: run the five batches in `references/interview.md`,
   writing into `new-lead-answers.json` per `references/answers-schema.md`.
4. **Derive the lead id**: kebab-case client + project title, matching the
   registry's `ID_RE` (`^[a-z0-9]+(-[a-z0-9]+)*$`). If a directory of that
   name already holds a *different* lead, suffix `-2`, `-3`, … — never
   overwrite. If it's the *same* lead, this is a resume (see Resume).
5. **Write + register**: write `new-lead-answers.json`; run
   `node scripts/lead-upsert.mjs --root <root> --id <id> --patch '<json>'`
   to create the registry entry — the patch must include `client`, `title`,
   and `created` (`YYYY-MM-DD`); `lead-upsert.mjs`'s own defaults cover
   `status: active`, `closed: null`, `value: null`, `scenario: null`, but
   not `created`, and the registry rejects an entry without one. Commit.
6. **Workflow ARCH**: launch the ARCH script from `references/workflows.md`
   with `topics` prepared from `answers.tech` + `evidence` (3-4 of: stack,
   integrations, hosting, compliance, per analyze-requirements `references/research.md`).
7. **Gate 1**: show `ARCHITECTURE.md` plus the workflow's `applied`/`rejected`
   report (see Gate mechanics). On approval: render the arch viewer per
   analyze-requirements `references/viewer.md` into `<leadDir>/dist/`, run the
   brief-writer prompt (`references/review-lenses.md`), commit
   `"<id>: architecture approved"`.
8. **Workflow ESTIMATE**: launch the ESTIMATE script — companion mode
   applies, since `ARCHITECTURE.md` already exists in `leadDir`.
9. **Gate 2**: show `estimation.md` plus its report. The user picks the
   scenario here — write it to `answers.proposal.scenario` and to the
   registry's `value`/`scenario` via `lead-upsert.mjs`. On approval: render
   `estimate.html` (estimate `SKILL.md` step 9, Companion mode's
   render-into-viewer form: `node scripts/render.mjs --json estimation.json
   --md estimation.md --out <leadDir>/dist --viewer index.html` — the
   `--viewer` flag is required here, since `dist/` already holds the arch
   viewer from Gate 1; omitting it drops the back-link) into `dist/`,
   brief-writer prompt, commit.
10. **Workflow PROPOSAL**: launch the PROPOSAL script —
    `answers.proposal.scenario` is already set, so this workflow never asks.
    `client.techLevel` and proposal's `client_tech_level` frontmatter use two
    different vocabularies for the same idea — the Assemble phase's writer
    must translate, not copy: `non-technical → non-tech`,
    `mixed → low-tech`, `technical → technical` (also stated in proposal's
    own Orchestrated mode section). Copying the answers-file spelling
    straight into the frontmatter is a validation failure the writer's
    exit-0 loop will simply retry away from — the real risk is a writer
    that guesses a *legal but wrong* target, which passes `checks-doc.mjs`
    and so fails silently. The two legs fail differently:
    - `mixed → technical` licenses full stack detail and container
      diagrams (proposal `references/writing.md` §4), so the document is
      written over the client's head.
    - `non-technical → low-tech` (or `→ technical`) loses the jargon scan,
      which `checks-client.mjs:56` runs **only** when `client_tech_level`
      is `non-tech`.

    The scan is off for `low-tech` and `technical` alike, so mis-mapping
    `mixed` cannot disable it — `non-technical` is the only leg that can.
11. **Gate 3**: show `proposal.md` plus its report. On approval: render
    `proposal.html` (proposal `SKILL.md` step 8:
    `node scripts/render.mjs --md proposal.md --estimation estimation.json
    --mermaid-bundle <path> --out <leadDir>/dist`) into `dist/`,
    brief-writer prompt, commit.
12. **Wrap**: report the dashboard URL; start it (`node serve.mjs` from the
    root, or its `start.sh`) if it isn't already running.

## Gate mechanics

Every gate presents: the document's path, `applied: N, rejected: M (reasons)`
from the workflow's Fix phase, and the `decisions` logged so far. Three
verdicts:

| Verdict | Effect |
| --- | --- |
| Approve | proceed to that gate's render + commit, then the next workflow |
| Request changes | fold the change into the answers file, or leave a fix note; resume the workflow (`resumeFromRunId`) rather than rerunning it whole |
| Abort | lead stays `active`; files already written stay in the lead dir; the user may mark it `lost` later, from the dashboard |

## Resume

`/new-lead <existing-id>`: the lead dir already exists → diff the current
answers against what the user wants changed, then rerun only the phases
whose inputs changed — a change to `tech`/`scope`/`delivery` reruns arch and
everything after it; a change touching only estimate's inputs reruns
estimate and proposal; a change touching only proposal's own fields
(priority, validity, firm profile) reruns proposal alone. A phase whose
artifacts are already present and whose inputs are unchanged is skipped.

## Failure

A workflow that doesn't complete is reported instead of gated: a per-phase
status table (`done` / `failed` with the exact `validate.mjs` finding /
`never-ran`). Options: retry (resume via `resumeFromRunId`), fix the inputs
then retry, or abort. Files the workflow already wrote stay in the lead dir
either way.

## Dependency

Node ≥ 20 and `npx likec4` (needed for arch rendering, per analyze-requirements
`references/viewer.md`) — check both upfront and stop before any work if
either is missing.
