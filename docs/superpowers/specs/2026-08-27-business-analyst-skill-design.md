# Business Analyst Skill — Design

Date: 2026-08-27
Status: approved in brainstorming session "BA"
Source: PRD "Business Analysis Agent Skill" (provided by user)

## Summary

A new `business-analyst` plugin containing one skill (`business-analyst`,
command `/business-analyst`) that turns raw client input (emails, notes,
transcripts, briefs) into a validated, traceable requirements package
**before** solution architecture begins. It sits upstream of the existing
`solution-architect` pipeline and is deliberately a **separate plugin**:
`new-lead` soft-detects it and recommends installing it, but the
solution-architect plugin keeps working without it.

The skill owns UNDERSTAND → CLARIFY → ANALYZE → STRUCTURE → VALIDATE and
stops before technology selection, architecture, estimation, or pricing
(PRD §26).

## Decisions made

| Decision | Choice |
| --- | --- |
| Placement | Separate plugin `plugins/business-analyst/`, own marketplace entry |
| Skill/command name | `business-analyst` (not `ba`) |
| Pipeline position | Optional step 0 of the `new-lead` chain, before `analyze-requirements` |
| Coupling | Loose. new-lead detects the *skill* at runtime; downstream skills detect the *artifact* (`requirements.json`) — never the plugin |
| Artifacts | One `requirements.md` (PRD's 5 documents as 5 parts) + one `requirements.json` (machine handoff). Option A — chosen over 5 separate files for traceability, one-home-per-fact, and sibling consistency |
| HTML render | None in MVP. md + json only; viewer/dashboard is a future enhancement |
| Depth | QUICK / STANDARD / DEEP asked upfront (estimate-skill pattern) |
| Refinement | Iterative. Never blocks on unanswered questions; re-running updates registers and readiness. Status ladder: DRAFT → CLARIFICATION_REQUIRED → ANALYZED → VALIDATED → READY_FOR_ARCHITECTURE |
| Machinery | Approach 2: SKILL.md + references/ + one dependency-free `scripts/validate.mjs` gate (no render/serve) |

## Ideas adopted from reference material (45ck/business-analysis-skills)

- **Ambiguity lint**: weasel-word check ("fast", "user-friendly", "etc.",
  "various", "flexible", "robust", "as appropriate", …) runs in
  validate.mjs against FR text; the word list is documented in
  `references/writing.md`.
- **Funnel / pyramid / diamond question sequencing** in the interview
  reference (funnel for vague inputs, pyramid for detailed-but-suspect
  inputs).
- **Constraint ≠ assumption**: separate `CON-` register beside `ASM-`.
- **Benefit hypothesis format** in the Discovery Brief: "We believe
  *capability* will result in *outcome* measured by *metric*."
- **Fresh-eyes subagent review** before human review (pattern copied from
  the proposal skill's `references/review.md`).
- **Power-interest grid** for stakeholders, only when >3 stakeholder groups.

Explicitly skipped: atomic 53-skill decomposition, CATWOE/SSM/PESTLE/
Porter's, MoSCoW (PRD's In/Out/Future/Unconfirmed covers it).

## Plugin structure

```
plugins/business-analyst/
├── .claude-plugin/plugin.json      v0.1.0, author as siblings
└── skills/business-analyst/
    ├── SKILL.md
    ├── README.md
    ├── references/
    │   ├── interview.md       layers 1–9, P1/P2/P3, question rules, sequencing shapes
    │   ├── frameworks.md      8 frameworks + symptom → framework selection table
    │   ├── writing.md         md section spec + canonical json fixture + ID conventions
    │   ├── ai-extension.md    PRD §18 question set, loaded only when AI detected
    │   └── review.md          fresh-eyes checklist
    └── scripts/
        ├── validate.mjs       dependency-free, Node ≥ 20
        └── test/validate.test.mjs
```

Plus: marketplace.json entry; ~8-line edit to
`plugins/solution-architect/skills/new-lead/SKILL.md`.

## SKILL.md hard rules

1. Never invent requirements — every material fact carries a label
   (`confirmed` | `assumed` | `recommended`) and a source. Recommendations
   never render as confirmed requirements.
2. Problem before solution — no technology recommendations, no
   architecture. The skill stops at WHAT; HOW belongs downstream.
3. Unknowns render as open questions, never silently filled. Distinguish
   *unknown* (client doesn't know yet) from *undecided* (client must choose).
4. Never block on unanswered questions — write the package with an honest
   status and readiness; a re-run refines it, never restarts the interview.
5. Every requirement carries a stable ID and traceability links;
   `node scripts/validate.mjs` must exit 0 before the package is final.
6. Human reviews requirements.md before status may become
   READY_FOR_ARCHITECTURE.

## Flow

1. **Detect evidence** — input docs? existing requirements.json (re-run
   path)? greenfield vs existing system? State findings; user overrides.
2. **Depth** — QUICK / STANDARD / DEEP.
3. **Extract** — known facts from all inputs before any question (PRD FR-001).
4. **Gap analysis** — extracted knowledge vs layers 1–9 → prioritized gap
   list (P1 blocking / P2 high-impact / P3 detail).
5. **Select frameworks** — from `references/frameworks.md`; justify picks;
   never apply all.
6. **Interview** — iterative: ask → analyze → detect contradictions → ask.
   Grouped, adaptive, never re-asks answered questions, offers concrete
   A/B/C/D options, challenges contradictions, requests real examples.
   Solution involves AI/agents → also work through `ai-extension.md`.
7. **Write** — requirements.md + requirements.json per `writing.md`.
8. **Validate** — validate.mjs; fix findings; re-run until clean.
9. **Fresh-eyes review** — subagent per `review.md`; fix; one cycle max.
10. **Human review** — show the readiness report; human confirms status.

Re-run: step 1 finds the existing package → diff new answers into the
registers, recompute readiness, advance status.

## requirements.json contract (schemaVersion 1.0)

Top-level: `schemaVersion`, `lead`, `status`, `depth`, `updated`, `mode`
(greenfield | existing), then:

- `context` — problem, goals (`G-` with metric + source), successMetrics
- `actors` — `ACT-`, type human|system|external, goal, painPoints
- `workflows` — `WF-`, state as-is|to-be, trigger, steps, exceptions
- `requirements` — `FR-`, text, label, source, scope (in|out|future|unconfirmed),
  `traces` {goal, workflow, rules[]}, acceptance[]
- `businessRules` — `BR-`, rule, source, examples[], openQuestion?
- `scenarios` — `SC-`, requirement, type happy|edge|error, given/when/then
- `nfrs` — `NFR-`, area, text, label
- `integrations` — `INT-`, system, direction read|write|both, label
- `data` — `DAT-`, entity, sensitivity, volume, label
- `constraints` — `CON-` (hard limits, confirmed)
- `assumptions` — `ASM-`, impact, status unconfirmed|accepted|resolved
- `openQuestions` — `Q-`, priority P1|P2|P3, reason, affects[], status,
  answer, architectureBlocker: bool
- `conflicts` — `CONFLICT-`, topic, statements[], status
- `scope` — {out[], future[], unconfirmed[]} (in-scope lives on FRs)
- `ai` — null, or {decisionBoundary, hitl, toolAccess, failureHandling,
  evalRequirements} per PRD §18
- `readiness` — {overall, areas{businessContext, workflows, rules,
  integrations, data, nfrs}, blockers[]}

Rules: agent judges area scores (with justification in the md); the script
recomputes `overall` and enforces consistency. Downstream tolerance:
consumers must ignore unknown fields; producers bump `schemaVersion` on
breaking change.

## requirements.md structure

Frontmatter: lead, status, depth, updated, readiness overall.

- **Part 1 — Discovery Brief**: problem, goals + benefit hypotheses,
  stakeholders (power-interest table when >3 groups), pain points,
  constraints.
- **Part 2 — Process & Domain**: as-is workflows (mermaid when >1 actor),
  decision points, business rules with concrete examples, exceptions,
  to-be capabilities, glossary.
- **Part 3 — Requirements**: scope, actors + permissions, FRs, NFRs, data,
  integrations, dependencies.
- **Part 4 — Acceptance Scenarios**: per critical FR — given/when/then and
  input → expected tables.
- **Part 5 — Readiness Report**: readiness bars per area, confirmed vs
  assumptions vs open questions vs conflicts, architecture blockers.

Conventions (mirrored from siblings): one home per fact — registers live
in Part 5, other parts reference IDs; unknowns render as honest absences
("Not provided — asked, awaiting client"), never `[TODO]`.

Depth scaling: QUICK → Parts 1, 3 (slim), 5. STANDARD → all parts.
DEEP → all parts + example-mapping tables + full scenario coverage.

## validate.mjs checks

| Group | Catches |
| --- | --- |
| Schema | required fields, ID formats (`FR-\d{3}` …), legal enums |
| ID integrity | duplicate IDs; dangling cross-refs (traces, affects, blockers, acceptance) |
| Label discipline | missing label/source; `recommended` in scope "in" without a paired open question |
| Ambiguity lint | weasel words in FR text → finding with FR id |
| Placeholders | `[TODO]`, `TBD`, `XXX`, empty md sections |
| Readiness math | overall ≠ computed mean; open P1 architectureBlocker with status past ANALYZED; READY with open conflicts |
| md ↔ json sync | ids present in json but absent from md (and vice versa); frontmatter mismatch |

CLI: `node scripts/validate.mjs --json requirements.json --md requirements.md`.

## new-lead integration (edit in solution-architect plugin)

- Detection: `business-analyst` skill available → offer it as step 0;
  absent → one-line install recommendation, chain runs 3 steps as today.
- State table: `requirements.json missing` becomes the first WIP gap —
  only when the plugin is installed; its absence never marks a lead WIP.
- Chain behavior: stop-after-return like other steps; skip when
  requirements.json already exists.
- Downstream prereqs unchanged: requirements.json is soft evidence, never
  a hard prerequisite (unlike proposal's ARCHITECTURE.md/estimation.json).

Downstream consumption paragraphs in analyze-requirements/estimate
SKILL.mds (mapping confirmed/assumed onto stated/proposed, seeding their
interviews) are a follow-up change, not part of this build — both already
ingest requirement documents generically via their detect-evidence steps.

## Testing

- `scripts/test/validate.test.mjs`, node test runner, fixture-driven:
  one valid canonical package (the fixture from writing.md — the estimate
  skill's booking-fixture pattern) plus one failing fixture per check group.
- Interview quality / PRD §22 metrics (extraction recall, gap detection,
  contradiction detection) are not machine-testable here; the PRD §23
  evaluation dataset is out of scope for MVP.

## Out of scope (MVP)

- HTML render/viewer/dashboard for the requirements package
- PRD §25 phase 2/3 items (transcript ingestion, change detection, BPMN
  generation, Jira/Linear export, traceability graph)
- Edits to analyze-requirements / estimate / proposal SKILL.mds
- PRD §23 evaluation dataset and quality-metric harness
