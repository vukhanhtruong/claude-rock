# Interview — combined staged interview for `new-lead-answers.json`

Read while running the orchestrated interview (SKILL.md step 3). This is the
**single** interview the orchestrator runs once; when arch-docs, estimate,
and proposal later run in orchestrated mode, each skips its own interview
step and reads its answers from `new-lead-answers.json` instead (per each
skill's own "Orchestrated mode" section). Every field this file can hold is
listed in `references/answers-schema.md` — that file is authoritative;
nothing here creates a field it doesn't already have.

## UX rules

- Questions go out in themed batches via `AskUserQuestion` — roughly 4-6
  questions per batch, one theme per round. Never one wall of questions.
- Multi-select where the options aren't mutually exclusive (e.g. compliance
  regimes, integrations); single-select where they are (e.g. tech level).
- Every prefilled answer is shown for confirmation in its batch, marked with
  its evidence source (see Prefill rules below) — never silently used.
- The user can say "skip the rest" in any batch. Remaining fields in that
  batch (and any batch not yet asked) become honest absences — they stay
  unset in the answers file, not guessed.

## The five batches

### Batch 1 — Client & context → `lead`, `client`

Purpose: identify the client and the lead record, and confirm who the
documents are written for.

Prefill source: evidence scan (client/project name sometimes visible in an
RFP header or notes file) and an existing `leads.json` entry if this lead
already exists.

Questions:

1. Client name? → `lead.client`
2. Project title, short (e.g. "CRM rebuild")? → `lead.title`
3. Industry? → `client.industry`
4. Primary contact — name and role (who decides)? → `client.contact`
5. Audience tech level for the documents we write: **non-technical / mixed /
   technical**? → `client.techLevel`
6. New or returning client? → `client.relationship` (`new`/`returning`)

`lead.id` (kebab-case) and `lead.created` (today's date) are derived from
the answers above, not asked — shown for confirmation, not counted against
the 4-6 question budget. `version` (always `1`) is stamped when the answers
file is first created, before this interview runs at all — never asked,
never shown. `decisions[]` is append-only, written by the orchestrator and
each skill's report — this interview never writes to it.

Note on wording (deliberate): question 5's options are the schema's own
enum literals — `non-technical`, `mixed`, `technical`. Proposal's standalone
interview (`proposal/references/interview.md:21`) phrases the same question
as "non-tech / low-tech / technical" — a different vocabulary for the same
field. The combined interview must emit values the schema accepts, since
that's the contract every orchestrated skill reads against; use the schema's
three literals here, not proposal's wording.

### Batch 2 — Scope → `scope`

Purpose: agree what's in, what's out, and what's still a guess, so arch-docs
and estimate both size from the same split.

Prefill source: evidence scan's feature list / scope text (RFP, backlog,
notes), or `ARCHITECTURE.md` scope if a companion doc already exists.

Questions:

1. One-paragraph summary — confirm or edit: what is this project, and what
   problem does it solve for the client? → `scope.summary`
2. Must-have list — confirm or edit. → `scope.mustHave[]`
3. Nice-to-have list — confirm or edit. → `scope.niceToHave[]`
4. Anything explicitly out of scope? → `scope.outOfScope[]`
5. Known assumptions — what are we assuming that hasn't been confirmed,
   and what changes if the assumption is wrong? → `scope.assumed[]`
   (estimate reads these as `proposed`, never `stated`)

Note on question 1 (deliberate): proposal's standalone interview
(`proposal/references/interview.md:25-27`) separately asks "the client's
business problem, in their words" to seed its Background & Objectives
section. There is no dedicated schema field for a business-problem
statement, so that question is folded into this summary question rather
than dropped — `scope.summary` is the field an orchestrated proposal run
reads for Background & Objectives, per proposal's own SKILL.md
orchestrated-mode section, which names `scope.summary` as a source
alongside `client` and `proposal`.

### Batch 3 — Tech & evidence → `tech`, `evidence` confirmations

Purpose: capture technical constraints and confirm what the evidence scan
already found, so arch-docs doesn't have to re-ask.

Prefill source: evidence scan (RFP/codebase/notes) and, if present,
`ARCHITECTURE.md`. A codebase source is recorded as
`evidence.sources[].type: "codebase"` — arch-docs still detects brownfield
vs. greenfield mode itself from its own directory scan (arch-docs SKILL.md's
orchestrated-mode section: "mode and project type stay scan-derived, as in
standalone"), independent of what this record says.

Questions:

1. "We found `<summary>` in `<source>` — correct?" for each detected
   `evidence.sources[]` entry — confirmed, not re-derived.
2. Tech stack constraints — mandated languages, frameworks, or vendors?
   → `tech.stack[]`
3. Integrations — what must this connect to? → `tech.integrations[]`
4. Hosting/deployment target — cloud, on-prem, region? → `tech.hosting`
5. Compliance regime — HIPAA, SOC 2, GDPR, other? → `tech.compliance[]`

### Batch 4 — Delivery & estimation → `delivery`

Purpose: pin down delivery constraints and the sizing approach so estimate
doesn't re-ask depth or technique.

Prefill source: evidence scan (named deadlines in an RFP) and the technique
recommendation computed from estimate's `references/techniques.md` decision
table (evidence-quality based, not a scanned value).

Questions:

1. Deadline — any hard date? → `delivery.deadline`
2. Budget range — any ceiling or range? → `delivery.budgetRange`
3. Depth: **QUICK** (feature-level tiering, wide bands) / **STANDARD**
   (task-level PERT, moderate) / **DEEP** (STANDARD plus per-scenario
   detail, narrower)? → `delivery.depth`
4. Technique — state the recommended technique from
   `estimate/references/techniques.md` §1's decision table and the evidence
   quality that picked it; user confirms or overrides. → `delivery.technique`
   (estimate's orchestrated mode takes this as already confirmed and logs it
   to `decisions` instead of re-asking)
5. Team notes — any team constraints or preferences (existing team,
   headcount limits, must-use vendor, who owns this going forward)?
   → `delivery.teamNotes`

Note: per-task factor scoring, hourly rates/seniority mix, Claude-plan
availability, the calibration table, and the expose-rates-to-client toggle
(estimate's own `references/interview.md` §4 items 3, 4, 5, 7, 8) are **not**
asked here — none has a schema field, and each remains estimate's own
judgment call during its Size step (SKILL.md step 5), which orchestration
does not skip.

### Batch 5 — Proposal prefs → `proposal`

Purpose: capture proposal-specific terms so an orchestrated proposal run
doesn't interview separately.

Prefill source: firm profile lookup — `<project>/.claude/proposal-profile.json`
→ `~/.claude/proposal-profile.json` → none.

Questions:

1. Validity period — default 30 days from today; confirm or override.
   → `proposal.validityDays`
2. Firm profile — show the found profile for confirm/edit, or interview the
   fields (firm, contact, website, blurb, relevant work) if none was found.
   → `proposal.firmProfile`
3. Where should firm-profile edits be stored — project-level or global?
   → `proposal.storageScope`
4. What the client cares about most: price, speed, or reliability?
   → `proposal.priority` (`price`/`speed`/`reliability`)

Note (deliberate): **scenario is not asked here.** `proposal.scenario` is
set by the orchestrator at gate 2, after estimate has produced scenarios to
choose from — asking for it during this interview would be premature; no
scenario in the file means proposal stops and reports rather than picking
one.

## Dedup table

One row per batch, mapping which sections of each skill's own standalone
interview this batch replaces under orchestration.

| combined batch | arch-docs interview § | estimate interview § | proposal interview § |
| --- | --- | --- | --- |
| Batch 1 — Client & context | — (arch-docs' bank asks nothing about client identity) | — (estimate's bank asks nothing about client identity) | §1 items 1, 2 (client name/decider; tech level) |
| Batch 2 — Scope | §1 Goals & Scope (goal, problem — not "users", see below) | §3 Clear-vs-assumed gate; §4 item 1 (scope confirm) | §1 item 3 (business problem, folded into `scope.summary` — see Batch 2 note); §2 both bullets (out-of-scope gaps; anything already rejected/demanded — reachable via `scope.outOfScope[]`/`scope.mustHave[]`) |
| Batch 3 — Tech & evidence | §2 Constraints (mandated tech, compliance portion); §10 Deployment & Infrastructure (hosting) | §1 Evidence detection table (evidence confirmation) | §0 (state known tech stack for correction) |
| Batch 4 — Delivery & estimation | §2 Constraints (budget, timeline portion); frontmatter `team` (ownership, folded into `teamNotes`) | §2 Depth question; §4 item 6 (deadline/budget); SKILL.md step 4 (technique — not part of interview.md itself, folded in here since it must be confirmed once, up front) | — |
| Batch 5 — Proposal prefs | — | — | §1 items 4 (priority — price/speed/reliability), 5 (scenario — explicitly gate-set, not asked), 6 (validity); §3 (firm profile) |

### Rows with no combined coverage, and why

- **arch-docs §1 Goals & Scope's "intended users" half** — Batch 2 Q1 asks
  what the project is and what problem it solves, but never who its
  intended users are. No schema field holds users distinctly from the rest
  of `scope.summary`, so nothing structural is lost, but the question
  itself doesn't ask it. Not covered here.
- **arch-docs §13 Quality Requirements & SLOs** (quality attribute + target,
  availability target, RPO/RTO) — no schema field exists for quality
  attributes or SLOs. Dropped from the combined interview; an orchestrated
  arch-docs run will render this section as an honest absence
  (`Not provided`, per arch-docs hard rule 3). This is a gap in what the
  schema captures, not something this document invents a field to fix.
- **arch-docs CONTEXT.md/DOMAIN-OVERVIEW.md rows** (domain terms, actors,
  processes, rules) — these are asked *while the `domain-modeling` skill is
  invoked* (arch-docs interview.md hard rule 5), not through the batched
  `AskUserQuestion` flow this document defines, and there is no schema
  field for them either way. Not covered here; whether an orchestrated run
  still invokes `domain-modeling` at all is an arch-docs orchestration
  question, out of scope for this interview reference.
- **arch-docs frontmatter `projectType`** — orchestrated mode keeps mode and
  project type scan-derived (arch-docs SKILL.md "Orchestrated mode"), so
  it's never asked, combined or standalone.
- **estimate §4 items 2, 3, 4, 5, 7, 8** (milestone grouping, factor scores,
  team rates/seniority, Claude-plan availability, calibration table,
  expose-rates toggle) — none has a schema field. Milestone grouping in
  particular has no home (the schema's `scope` group has no ordered-groups
  field); the rest remain estimate's own Size-step judgment calls (see
  Batch 4 note above). Not covered here.
- **estimate §5 Loop rule** — a runtime behavior (stop and re-gate on a
  scope hole discovered mid-sizing), not a question. Not applicable to an
  interview reference.

## Prefill rules

- The evidence scan runs **before Batch 1**: RFP, notes, and any other
  documents the lead directory holds are read and summarized into
  `evidence.sources[]` (`{ type: rfp|codebase|notes|none, path, summary }`).
- A codebase source (code exists, no docs) is carried as
  `evidence.sources[].type: "codebase"`. This does not drive arch-docs' mode
  detection — arch-docs keeps mode and project type scan-derived from its
  own directory scan in orchestrated mode, same as standalone.
- Every prefilled value is confirmed in its batch, never silently used —
  shown with its source (e.g. "found in `rfp.md`") so the user can correct
  it before it's written.
