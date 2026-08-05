---
name: estimate
description: Interview-driven project estimation with AI-aware delivery scenarios. Use when the user asks for an estimate, effort sizing, a quote, a proposal, a timeline, staffing, or "how long would this take" — with or without existing architecture docs.
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
   ask only holes, run the clear-vs-assumed gate before sizing.
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
risk register, flip the `electedDocs` estimation entry to `elected: true`,
place estimation.md beside ARCHITECTURE.md so the arch-docs viewer picks it
up as a companion page; link the interactive page from it.

## Dependency

Node ≥ 20. No npm install needed — the scripts are dependency-free.
