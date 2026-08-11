---
name: proposal
description: Assemble a pre-sales client proposal from arch-docs and estimate outputs — interviewed client context, one offered scenario as a price range, and a print-ready client page. Use when the user asks for a proposal, a client pitch document, a quote document, or "something I can send the client".
---

# proposal

Assemble a pre-sales client proposal: proposal.md as the source of truth and
a self-contained, print-ready proposal.html the user can send or print to
PDF.

## Hard rules

1. Assembly only — never re-analyze. Architecture facts come from
   ARCHITECTURE.md; every number comes from estimation.json via
   `scripts/derive.mjs`. A number the derivation didn't produce does not
   go in the document.
2. Both prerequisites are hard: no ARCHITECTURE.md or no estimation.json →
   stop and name the skill to run (`arch-docs` / `estimate`).
3. One scenario reaches the client — the one picked in the interview,
   presented as a range. The others never leak.
4. `node scripts/validate.mjs` must exit 0 before the page renders;
   `render.mjs` re-runs the same checks and refuses on findings.
5. Human review of proposal.md before anything is rendered for or sent to
   a client.

## Flow

1. **Prereq gate**: ARCHITECTURE.md and estimation.json both exist, or stop.
2. **Interview**: follow `references/interview.md` — client context, tech
   level, scenario pick, validity, firm profile (with storage-scope choice).
3. **Figures**: `node scripts/derive.mjs --estimation <dir>/estimation.json
   --scenario <id> --out <dir>/proposal-figures.json` — the only numbers
   allowed in the document.
4. **Write**: proposal.md per `references/writing.md` (ten sections,
   frontmatter contract, tech-level language).
5. **Validate**: `node scripts/validate.mjs --md <dir>/proposal.md
   --estimation <dir>/estimation.json` — fix findings, re-run until clean.
6. **Fresh-eyes review**: dispatch a subagent per `references/review.md`;
   fix findings, re-run validate; one re-review cycle max.
7. **Human review**: show the user proposal.md and wait for approval.
8. **Render**: `node scripts/render.mjs --md <dir>/proposal.md
   --estimation <dir>/estimation.json --mermaid-bundle <path> --out <dir>`
   — reuse the mermaid bundle built for the arch-docs viewer
   (arch-docs `references/viewer.md` §1). When a rendered viewer exists,
   `--out` the viewer's own directory so proposal.html ships beside
   index.html and estimate.html; proposal.html itself carries no link back.
9. **Serve**: `node ../arch-docs/scripts/serve.mjs <dir>`; report the URL.

## Placement

proposal.md lives beside ARCHITECTURE.md and estimation.md. proposal.html
follows the estimate.html rule: into the rendered viewer's directory when
one exists, else beside proposal.md.

## Dependency

Node ≥ 20. Scripts are dependency-free.

## Orchestrated mode

Active only when the caller provides a path to a `new-lead-answers.json`
file. Without that file this section does not apply — run the flow above
unchanged.

- Skip step 2 (Interview): client context and tech level come from
  `client`, validity and firm profile (with storage scope) from `proposal`,
  and the scenario pick from `proposal.scenario` — the orchestrator sets it
  at the estimate gate before this skill runs. No scenario in the file →
  stop and report; never pick one yourself. `proposal.priority` (price,
  speed, or reliability), when present, shapes the Executive Summary's
  emphasis the same way the standalone interview's answer would; absent, do
  not pick a default emphasis.
- `client.techLevel` uses the answers-file vocabulary; the frontmatter uses
  proposal's. Translate: `non-technical → non-tech`, `mixed → low-tech`,
  `technical → technical`.
- Background & Objectives' client-problem line comes from `scope.summary`
  — the one field this skill reads outside the `client`/`proposal` groups
  named above.
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
