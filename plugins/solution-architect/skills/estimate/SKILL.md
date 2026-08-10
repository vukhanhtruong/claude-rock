---
name: estimate
description: Interview-driven project estimation with AI-aware delivery scenarios. Use when the user asks for an estimate, effort sizing, a quote, a timeline, staffing, or "how long would this take" — with or without existing architecture docs.
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
   ask only holes, run the clear-vs-assumed gate before sizing. Before
   proposing milestones, read `references/slicing.md` — slices are judged
   there, not computed.
4. **Technique**: recommend from `references/techniques.md`, state why,
   cite the method's sources (its §Sources — attribution + link, never
   quoted text), confirm.
5. **Size**: write judgments to `estimation-inputs.json`
   (`references/writing.md` — the booking fixture is the canonical shape).
6. **Compute**: `node scripts/compute.mjs --inputs estimation-inputs.json --out estimation.json`
7. **Write**: estimation.md per `references/writing.md`.
8. **Validate**: `node scripts/validate.mjs --md estimation.md --json estimation.json`
   — fix findings, re-run until clean.
9. **Render + serve**:
   `node scripts/render.mjs --json estimation.json --md estimation.md --out <dir>`
   (add `--client-only` for a client-safe file) — render re-runs the validation
   checks itself and refuses on findings, so an unvalidated page cannot ship.
   Then serve with the arch-docs skill's `serve.mjs`; report the URL.

## Companion mode

When ARCHITECTURE.md exists: §6 components seed the WBS, §15 risks seed the
risk register, seed the `components` roster from §6 rows (use the LikeC4
model's container and component ids where one exists — dotted ids like
`atlas.goldStore`) and tag every feature with the component it implements,
flip the `electedDocs` estimation entry to `elected: true`,
place estimation.md beside ARCHITECTURE.md so the arch-docs viewer picks it
up as a companion page; link the interactive page from it. When a rendered
viewer exists, render estimate.html **into the viewer's own directory**
(`--out <viewer dir>` plus `--viewer index.html` for the back-link, internal
view only; the client render strips it) — index.html and estimate.html then
ship as one self-contained folder, and the viewer's estimation tab links the
copy inside it. Without a viewer, keep estimate.html beside estimation.md —
the viewer also finds it there when rendered later.

## Dependency

Node ≥ 20. No npm install needed — the scripts are dependency-free.

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
