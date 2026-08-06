# Proposal Skill — Design

Date: 2026-08-06
Status: approved (brainstorming session)

## Purpose

A new user-invocable agent skill, `proposal`, third sibling in the
`solution-architect` plugin after `arch-docs` and `estimate`. It assembles a
pre-sales client proposal from those two skills' outputs plus a short
interview, producing `proposal.md` (source of truth) and `proposal.html`
(self-contained, print-ready client deliverable rendered like
`estimate.html`).

The skill assembles and frames — it never re-analyzes. Architecture facts come
from ARCHITECTURE.md; every number comes from `estimation.json`.

## Decisions made

| Decision | Choice |
|---|---|
| Proposal type | Pre-sales client proposal only (no SOW/legal variant) |
| Prerequisites | Both hard: ARCHITECTURE.md **and** estimation.json must exist, else stop and name the missing skill |
| Audience handling | Interview asks client tech level (non-tech / low-tech / technical); one document, language adapted throughout |
| Pricing | One scenario chosen in interview; presented as a range from estimate confidence bounds; other scenarios never leak |
| Viewer role | Client deliverable: self-contained single file, print-ready, no internal data or back-links |
| Firm identity | Interviewed once, cached as a profile; user chooses storage scope (global `~/.claude/` or project `.claude/`) |
| Data flow | Approach A: proposal.md is the data source; validate gates; render parses md → html |
| Qualitative gate | Fresh-eyes subagent review after script validation, one fix cycle, human review final |

## Template assessment (drshahizan template-proposal.md)

The referenced academic template is both too long and lacking:

| Template section | Disposition |
|---|---|
| Executive Summary, Background, Objectives, Scope, Conclusion | Kept (Conclusion becomes Next Steps) |
| Software Process Model | Folded into Delivery Approach — clients want phases/QA/comms, not process theory |
| Budget, Resources, Timeline & Deliverables | Merged into Investment & Timeline + Team, sourced from estimation.json |
| System Architecture, Technical Specifications | Merged into Proposed Solution, depth set by tech level |
| Risk Assessment | Client-relevant risks only, inside Delivery Approach; full register stays internal |
| Prepared-by group / matrix numbers | Dropped (academic artifact) |
| Missing entirely | Out of Scope & Assumptions, commercial terms, firm identity, validity date, next steps — all added |

Modular Earth `proposal` SKILL.md contributed: assembly-only doctrine, hard
prerequisite validation, mandatory human review before client delivery.

## 1. Plugin layout

```
plugins/solution-architect/skills/proposal/    ← NEW
├── SKILL.md                    ← flow + hard rules, mirrors siblings' style
├── references/
│   ├── interview.md            ← prereq gate, client-context questions, profile handling
│   ├── writing.md              ← proposal.md contract: frontmatter + 10 sections + tech-level lexicon
│   └── review.md               ← subagent reviewer charter
├── scripts/
│   ├── derive.mjs              ← estimation.json + scenario id → proposal-figures.json
│   ├── validate.mjs            ← 8 checks, exit 0 gates render
│   ├── render.mjs              ← proposal.md → proposal.html
│   ├── lib/                    ← figures derivation, checks, jargon list
│   └── test/
│       └── fixtures/           ← passing pair + failing fixtures
└── assets/
    └── proposal-template.html  ← print-ready client page shell
```

Shared from siblings via relative in-plugin paths: arch-docs `serve.mjs`,
IBM Plex fonts + embed pattern, bundled-mermaid recipe from the viewer.

## 2. proposal.md contract

Frontmatter (machine-readable contract for validate + render):

Flat keys only — the shared `frontmatter.mjs` parser is flat key:value with
JSON values for arrays:

```yaml
client: Acme Corp
client_tech_level: non-tech | low-tech | technical
scenario: 2eng-max5x           # id must exist in estimation.json
currency: USD
valid_until: 2026-09-06        # must be a future date
jargon_allow: []               # per-term overrides for the non-tech jargon scan
source_architecture: ../ARCHITECTURE.md
source_estimation: ../estimation.json
```

Ten sections, each with a named source:

| # | Section | Source |
|---|---|---|
| 1 | Executive Summary — problem, solution, price range, duration; 1 page max | synthesis |
| 2 | Background & Objectives — client problem + SMART goals | interview |
| 3 | Proposed Solution — plain-language architecture, one simplified mermaid diagram | ARCHITECTURE.md |
| 4 | Scope — in-scope features | estimation.json WBS |
| 5 | Out of Scope & Assumptions | estimation.json + interview |
| 6 | Delivery Approach — milestones, ways of working, QA, comms, client-relevant risks | estimation.json + interview |
| 7 | Investment & Timeline — range table per milestone + totals | estimation.json |
| 8 | Team — roles from the chosen scenario | estimation.json |
| 9 | About \<Firm\> — blurb, relevant work, contact | cached profile |
| 10 | Next Steps — validity date, acceptance path, call to action | interview |

Tech level shapes §3 most: non-tech gets analogy plus a boxes-and-arrows
diagram with few nodes; technical gets a container diagram and stack table.

## 3. Interview (references/interview.md)

Pre-fill from evidence, ask only holes — same doctrine as estimate.

**Phase 0 — prereq gate + evidence load.** Both prereqs exist or stop naming
the missing skill. Read ARCHITECTURE.md, estimation.json, estimation.md. Load
cached profile. State everything pre-filled.

**Phase 1 — client context** (only-human-knows questions):
client name + decision-maker role; tech level; client's problem in their own
words; what the client values most (price / speed / reliability — shapes exec
summary emphasis); which scenario to offer (listed with cost + duration);
validity period (default 30 days).

**Phase 2 — gaps + confirmation:** extra out-of-scope items; client
constraints or rejected options; profile confirm-or-edit. Anything in the
source docs that is conflicting or unclear → ask, never guess; one question
at a time.

**Firm profile.** Lookup order: `<project>/.claude/proposal-profile.json` →
`~/.claude/proposal-profile.json` → none (interview fresh). On first save the
interview asks which scope to store in; project scope wins when both exist.
Shown and confirmed each run; edits saved back to the same scope. Corrupt or
unreadable file → warn, re-interview, rewrite.

## 4. Validation (scripts/validate.mjs)

Exit 0 gates rendering. Checks:

1. Frontmatter complete: client, tech level, scenario id, valid_until, sources.
2. Scenario id exists in estimation.json.
3. Every money and duration number in the md matches the deterministic
   derivation from estimation.json (cost/duration ranges scaled by the
   feature low/high spread, per-milestone splits from the roadmap shares).
   estimation.json carries no client-facing ranges itself, so
   `scripts/derive.mjs` computes `proposal-figures.json` as an authoring
   aid, and the validator recomputes the same figures internally — matching
   the file is never trusted, so hand-edited figures can't pass. Kills
   hand-invented pricing.
4. All 10 sections present and non-empty.
5. No `[TODO]`, no placeholder text, no empty tables.
6. No internal leakage: other scenario names, provenance tags, confidence
   internals, internal risk register ids.
7. `valid_until` is a future date.
8. Non-tech level → jargon scan against a deny-list in references
   (fails, not warns); `jargon_allow` frontmatter overrides per term when the
   client themselves uses it. Contact block in §9 is exempt.

## 5. Subagent review (references/review.md)

After validate passes, dispatch a fresh-eyes general-purpose subagent with
only proposal.md, estimation.json, and the tech level — no interview context,
so it reads like the client will. Charter:

1. Would the stated tech level understand every section? Flag any sentence too
   technical (catches jargon beyond the deny-list).
2. Executive summary answers price / duration / what-we-build within a page?
3. Persuasive but honest — no hype, no unverifiable claims.
4. Internal-leakage scan (second pair of eyes on validate check 6).
5. Cross-section contradictions (scope vs out-of-scope, price table vs
   summary).

Findings → main agent fixes → re-run validate → one findings-only re-review
max. Human review of proposal.md is the final gate before render + send.

## 6. Render + viewer (scripts/render.mjs → proposal.html)

- Parses proposal.md, fills `assets/proposal-template.html`.
- Self-contained single file: inline CSS, IBM Plex fonts as data URIs,
  mermaid rendered with the same bundled recipe the arch-docs viewer uses.
- Print-ready: `@media print` stylesheet — per-section page breaks, A4
  margins, nav hidden, price table never split across pages. PDF = print
  from browser.
- Screen: fixed side nav over the 10 sections, clean reading column. A
  document, not a tool — no what-if interactivity.
- Client-safe by default: no back-links to internal pages, no provenance,
  nothing beyond proposal.md content. Render re-runs the validate checks and
  refuses on findings.
- Placement mirrors estimate.html: rendered viewer exists → `--out <viewer
  dir>` beside index.html and estimate.html (viewer may link *to* it;
  proposal.html links back to nothing); no viewer → beside proposal.md.
- Served via arch-docs `serve.mjs`; URL reported.

## 7. Flow (SKILL.md)

```
/proposal
  → prereq gate (ARCHITECTURE.md + estimation.json, both hard)
  → interview (client ctx, tech level, scenario pick, profile w/ scope choice)
  → derive.mjs (scenario figures: ranges + milestone splits, authoring aid)
  → write proposal.md (10 sections, frontmatter contract)
  → validate.mjs (8 checks, exit 0 gates)
  → subagent review (fresh-eyes, 1 fix cycle)
  → validate.mjs again
  → render.mjs → proposal.html (self-contained, print-ready, client-safe)
  → human reviews → serve.mjs, report URL
```

Hard rules for SKILL.md (house style):

1. Assembly only — never re-analyze; architecture facts from ARCHITECTURE.md,
   every number from estimation.json computed output.
2. Both prerequisites are hard; missing → stop and name the skill to run.
3. One scenario reaches the client; the rest never leak.
4. `node scripts/validate.mjs` must exit 0 before the page renders; render
   re-checks and refuses on findings.
5. Human review before anything is sent to a client.

## 8. Error handling

- Prereq missing → stop, name the skill (`arch-docs` / `estimate`).
- Scenario id or milestone data missing from estimation.json → "re-run
  estimate"; never improvise numbers.
- Past `valid_until`, placeholders, leakage → named validate finding; agent
  fixes and re-runs.
- Profile file corrupt → warn, re-interview, rewrite.

## 9. Testing

TDD; Node built-in test runner; dependency-free; mirrors sibling
`scripts/test/` + `fixtures/` layout.

- `validate.mjs`: one passing fixture pair (proposal.md + estimation.json)
  plus failing fixtures — invented number, missing section, jargon under
  non-tech, other-scenario leak, past validity date, `[TODO]`.
- `render.mjs`: golden fixture → html is self-contained (no external URLs),
  all 10 sections present, fonts embedded, print stylesheet present; refuses
  invalid input.

## Dependency

Node ≥ 20. Scripts dependency-free, same as estimate.
