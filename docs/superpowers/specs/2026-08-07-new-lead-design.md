# /new-lead — Lead Orchestrator + Leads Dashboard — Design

Date: 2026-08-07
Status: approved design, pending implementation plan

## Purpose

One command that takes a fresh pre-sales lead from "evidence in hand" to three
approved, rendered documents — architecture docs, estimate, proposal — by
orchestrating the existing `arch-docs`, `estimate`, and `proposal` skills with
dynamic workflows (parallel subagents), plus a persistent leads workspace with
an interactive dashboard for managing all leads in one place.

## Constraints that shaped the design

1. **Hard dependency chain.** proposal requires ARCHITECTURE.md +
   estimation.json; estimate seeds from arch §6/§15. The three documents
   cannot build in parallel — parallelism lives *inside* each phase
   (research fan-out, review panels), not across documents.
2. **Workflow agents cannot talk to the user.** All interviews and approvals
   run in the main session; workflows run unattended between gates.
3. **Existing skills stay intact for standalone use.** Headless mode is an
   additive branch gated on an explicit trigger; invoking a skill on demand
   without the trigger behaves exactly as today.

## Decisions (from brainstorm)

| Topic | Decision |
|---|---|
| Interviews | One combined interview upfront, deduplicated across the three skills. **Staged UX: themed batches of ~4-6 questions via AskUserQuestion — never one wall of questions.** |
| Human checkpoints | One gate per document: review ARCHITECTURE.md → estimate runs → review estimation.md → proposal runs → review proposal.md. |
| Skill reuse | Add a small "Orchestrated mode" section to each of the three skills, triggered only by an answers-file input. Standalone flow untouched. |
| Quality | Review panel per document (2-3 reviewers, distinct lenses) + verify-then-fix fixer. No agent debate. One re-review cycle max (proposal's existing rule, generalized). |
| Lead input | Mixed per lead (RFP, notes, codebase, nothing) — evidence detection upfront, interview prefilled from evidence. |
| Orchestration shape | Approach A: three workflows (one per document), main loop between them for interview and gates. |
| Dashboard persistence | Dependency-free Node server + `leads.json`. No sqlite (overkill: dozens–hundreds of leads, single user; JSON is git-diffable and hand-repairable). |
| Leads root discovery | `leads.json` is the marker — walk up from cwd like `.git` discovery. Not found → offer to init at cwd. No config file. |
| Lead lifecycle | Minimal: `active` / `won` / `lost`. Schema accepts new values later without migration. |
| Card detail canvas | React Flow for the per-lead lineage map only; vendored bundle (no CDN); read-only click-through. List/cards/timeline/stats stay vanilla self-contained. |
| Versioning | leads-root is a git repo (offered at init). /new-lead commits at each gate pass and on won/lost. Answer edits + regeneration are tracked by git history — no custom versioning. |

## Workspace layout

```
<leads-root>/
├── leads.json            registry + root marker
├── serve.mjs             dashboard server (copied from skill assets)
├── start.sh              one-line launcher: node serve.mjs
├── index.html            dashboard (copied from skill assets)
├── detail.html           lead detail page (React Flow canvas)
├── vendor/reactflow-bundle.js
└── acme-crm/             one dir per lead (kebab-case client+project)
    ├── new-lead-answers.json    combined interview output — generation truth
    ├── brief.md                 executive summary + decision log (agent-written at gates)
    ├── notes.md                 human notes (dashboard-writable)
    ├── ARCHITECTURE.md, model.c4, CONTEXT.md …
    ├── estimation-inputs.json, estimation.json, estimation.md
    ├── proposal.md, proposal-figures.json
    └── dist/                    rendered pages: index.html, estimate.html, proposal.html
```

The root is self-contained: server + dashboard are copies, so `node serve.mjs`
works with no agent and survives plugin moves. /new-lead refreshes the copies
when skill assets are newer (version stamp in copied files).

## Skill placement

```
plugins/solution-architect/skills/new-lead/
├── SKILL.md              orchestrator flow
├── references/
│   ├── interview.md      combined interview: themes, dedup map, prefill rules
│   ├── workflows.md      the three workflow script templates + report schemas
│   └── review-lenses.md  reviewer lens prompts + fixer verify-then-fix protocol
├── scripts/
│   ├── serve.mjs         dashboard server source
│   ├── build-map.mjs     lead-map.json builder (nodes/edges from lead dir files)
│   └── validate.mjs      leads.json schema check
└── assets/dashboard/     index.html, detail.html, vendor bundle, start.sh
```

## Orchestration flow

```
 1. Root discovery      walk-up for leads.json; init (offer git init) if missing
 2. Evidence scan       RFP file(s)? codebase? notes? nothing? — state findings,
                        user can override (generalizes estimate's evidence detection)
 3. Combined interview  staged themed batches: client/context → scope → tech →
                        delivery/pricing → proposal prefs; prefilled from evidence;
                        writes new-lead-answers.json; registers lead as `active`
 4. Workflow 1: ARCH    (see Workflow internals)
 5. GATE 1              user reviews ARCHITECTURE.md + applied/rejected report
                        → on pass: render arch viewer into dist/, commit
 6. Workflow 2: ESTIMATE
 7. GATE 2              user reviews estimation.md; picks scenario here
                        → render estimate.html into dist/, commit, registry value set
 8. Workflow 3: PROPOSAL
 9. GATE 3              user reviews proposal.md (proposal hard rule 5)
                        → render proposal.html into dist/, commit
10. Wrap                report dashboard URL; serve if not running
```

Per-phase rendering means dashboard links go live progressively; a card never
links to a missing file (server stat()s dist/ files, missing → "pending" chip).

Technique choice (estimate) and scenario pick (proposal) move into the main
loop — technique recommended and confirmed during interview batch 4, scenario
picked at gate 2 — so no workflow agent ever needs to ask the user anything.

## Workflow internals

**Workflow 1 — ARCH (~6 agents)**

```
phase Research   3-4 agents in parallel (tech stack, integrations, hosting,
                 compliance — per arch-docs references/research.md, seeded
                 from answers.json)
phase Write      1 agent: model.c4 + ARCHITECTURE.md (headless arch-docs);
                 runs its validate.mjs loop until exit 0
phase Review     3 reviewers in parallel — lenses: provenance-integrity,
                 internal-consistency, completeness-vs-interview
phase Fix        1 fixer: verify-then-fix, re-validate, emit report
```

**Workflow 2 — ESTIMATE (~5)**: size+write agent (headless estimate: WBS from
arch §6, risks from §15, compute.mjs, validate loop) → 2 reviewers
(numbers-trace, assumptions-honesty) → fixer.

**Workflow 3 — PROPOSAL (~5)**: derive.mjs + write agent → fresh-eyes review
(existing references/review.md) + client-readability reviewer in parallel →
fixer. One re-review cycle max.

All agents return schema-forced JSON: `{files, validateExit, findings[] |
applied[] | rejected[], decisions[]}`. The main loop reads the report and
presents the gate.

**Review mechanic — reviewers point, fixer fixes, no debate.** Fixer verifies
every finding against sources before acting:

| Verdict | Action |
|---|---|
| True | fix, note change |
| Partly true | fix true part, log rejected part + reason |
| Wrong | reject with evidence (estimation.json, answers.json, ARCHITECTURE.md) |

Fixer's authority is source files, not reviewer opinion — numbers trace to
compute.mjs/derive.mjs output, facts to provenance tags. Disputed findings
surface in the gate report (`applied: N, rejected: M (reasons)`); the user is
the tiebreak.

## Headless mode (change to the three existing skills)

One added section per SKILL.md, uniform shape:

```markdown
## Orchestrated mode
When invoked with an answers file (path to new-lead-answers.json):
- Skip the interview — read answers from the file; a missing answer is an
  honest absence, never invented.
- Skip user confirmations (technique confirm, research-drop surfacing) —
  log to decisions[] in the report instead.
- Never render or serve — the orchestrator owns rendering.
- Everything else — hard rules, validate loops, scripts — unchanged.
```

No answers file → today's interactive flow, byte-for-byte untouched.

## Failure and retry

- Workflow incomplete → main loop reports instead of the gate: per-agent
  status (done / failed with the exact finding / never-ran), files that did
  land stay in the lead dir. Options: retry, fix inputs then retry, abort.
- Retry = `Workflow({scriptPath, resumeFromRunId})` — completed agents return
  cached, only the broken step and its dependents rerun.
- Session died entirely → `/new-lead <lead-id>` enters resume mode: finds
  answers.json and existing artifacts, reruns from the first missing one.
- Dashboard stays dumb on failure: stage shows `pending` until a gate passes
  (disk truth); failure detail is a session concern, not registry state.

## Dashboard

**Server** (`serve.mjs`, dependency-free Node ≥ 20):

```
GET  /                    index.html
GET  /detail/:id          detail.html
GET  /api/leads           leads.json + per-lead stat() of dist/ files
GET  /api/leads/:id/map   lead-map.json (built from lead dir files)
POST /api/leads/:id       {status, closed?} → atomic write (temp + rename)
POST /api/leads/:id/notes notes.md write
GET  /<lead>/dist/*       rendered pages (static)
```

Registry writes use a lockfile (`leads.json.lock`) so a concurrent /new-lead
session can't tear the file; lead dirs are never shared between sessions.

**leads.json schema**

```json
{ "version": 1,
  "leads": [{
    "id": "acme-crm", "client": "Acme", "title": "CRM rebuild",
    "status": "active",
    "created": "2026-08-07", "closed": null,
    "value": {"low": 48000, "high": 59000, "currency": "USD"},
    "scenario": "balanced"
  }] }
```

`value`/`scenario` are null until gate 2. Registry is business metadata only;
agents never generate documents from it — generation truth is
`new-lead-answers.json` in the lead dir.

**Views** (one index.html, view switcher, self-contained, both themes):
cards (progressive: interview ✓ → arch ✓ → estimate ✓ → proposal …, with
filter by status/client/text, sort by date/value), timeline (leads on a time
axis with month markers), info wall (dense sortable table). Stats strip always
visible: won this month, win rate, pipeline value, avg cycle days — computed
client-side from the registry, no stored aggregates.

**Card detail** (`detail.html`) — layout instinct (final layout decided at
mockup review):

- Top: executive summary (from `brief.md`) + next-action banner ("proposal
  validity expires in 11d", "waiting gate 2")
- Key-facts strip: client, industry, deadline, budget, tech chips (answers.json)
- Center: React Flow lineage canvas — nodes: evidence → interview →
  ARCHITECTURE (components) → estimate (scenarios) → proposal (figures);
  edges = provenance. Pending nodes grey with the gate that unlocks them.
  Interactions: click doc node → real page in new tab; click component →
  arch viewer deep-link where LikeC4 URLs allow; click scenario → what-if
  page; expand node → inline data; hover → provenance tooltip; pan/zoom/
  minimap. Read-only — docs change only through skills.
- Right rail: top-3 risks (arch §15 / risk register), open questions (scope
  items still `proposed`), decision log (from brief.md)
- Bottom: activity feed (git log of the lead dir), human notes box (the only
  dashboard-writable content besides won/lost)
- Won/Lost button on card and detail header (POST → registry → stats
  re-render; `closed` stamped on leaving active)

`build-map.mjs` derives `lead-map.json` and the derived panels from files the
pipeline already produced; `brief.md` (executive summary + decision log) is
written by a small agent at each gate pass.

## Error handling and edge cases

- Node < 20 or `npx likec4` missing → checked at step 1, stop before work.
- leads.json corrupt → server refuses writes, reports; atomic rename prevents
  torn writes.
- Lead dir name collision → suffix `-2`, never overwrite.
- Lead abandoned mid-pipeline → stays `active` showing its stuck stage; can be
  marked `lost` anytime.
- Answers edited later → `/new-lead <lead-id>` diffs answers, reruns affected
  phases via workflow resume; git history records versions.

## Testing

- `serve.mjs`: node test — routes, atomic write + lockfile, stat enrichment,
  walk-up root discovery.
- `build-map.mjs`: fixture lead dir → expected lead-map.json.
- `validate.mjs`: leads.json schema cases.
- Dashboard + detail UI: browser check at mockup and at implementation
  (design-taste-frontend flow).
- Orchestration prose: one end-to-end lead on fixture inputs (estimate's
  booking fixture is canonical).

## Implementation requirements (for the plan)

1. **Card-detail mockup must be shown to and approved by the user before
   implementing detail.html.** Mockup review is where panels get trimmed.
2. Dashboard and detail pages go through the `design-taste-frontend` skill.
3. React Flow bundle is vendored at skill-build time (same recipe as the
   arch-docs mermaid bundle); no CDN at runtime.
4. Headless-mode sections are additive only — zero edits to existing skill
   steps; standalone invocations must behave identically before/after.
5. The implementation plan is split into multiple files (one per milestone /
   work area), not a single monolithic plan document.
6. Run `/simplify` on changed code before every commit — quality pass is part
   of each milestone's definition of done.
