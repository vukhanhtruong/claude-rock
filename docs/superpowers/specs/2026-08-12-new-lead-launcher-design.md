# new-lead as a launcher — design

**Date:** 2026-08-12
**Status:** approved
**Supersedes (in part):** `docs/superpowers/specs/2026-08-07-new-lead-design.md`

## Problem

`/new-lead` today owns the whole pre-sales pipeline: a combined interview, three
headless Workflows, three human gates, all rendering, and the leads dashboard.
That makes it a second implementation of work the three sub-skills already do,
and it means every change to `arch-docs`, `estimate`, or `proposal` has to be
mirrored into new-lead's interview, its answers schema, and its workflow scripts.

`/new-lead` should instead do one job — prepare the workspace and walk the human
through the sequence — and let each skill run as itself:

```
/new-lead → /analyze-requirements → /estimate → /proposal
```

## Decisions

| Decision | Choice | Why |
| --- | --- | --- |
| Scope of new-lead | Thin launcher | The sub-skills already interview, validate and render. Duplicating that is the whole maintenance cost. |
| Handoff | Auto-invoke, stop between | One session, chain is automatic, but the human sees each document before the next skill starts. |
| Lead identity | Folder name in `leads/` | The filesystem is the source of truth; uniqueness comes free from the directory. |
| `client` / `title` | Both asked, both optional | `client` is display-only; `title` always falls back to the folder name. |
| Naming standard | kebab-case | Matches the existing `ID_RE`; snake would mean widening the regex and every route in `serve.mjs`. |
| Dead code | Removed | The combined interview, the workflow scripts, and the sub-skills' `Orchestrated mode` sections become unreachable. |
| Dashboard | Rewired to real files | `new-lead-answers.json` no longer exists; the panels must read what does. |
| `arch-docs` rename | Name only, phase 0 | Landing it first means the launcher is written with the right name and a failure is attributable to one change. |

## Workspace

```
<root>/
├── leads.json          registry — stays at root, so findLeadsRoot is unchanged
├── start.sh            the only executable at root
├── leads/
│   ├── acme-corp-payments-rework/
│   │   ├── <client documents, dropped in by the human>
│   │   ├── ARCHITECTURE.md, estimation.json, proposal.md
│   │   └── dist/
│   └── …
└── scripts/
    ├── serve.mjs, stats.mjs, index.html, detail.html
    ├── lib/    registry.mjs, enrich.mjs, map.mjs
    └── vendor/ reactflow-bundle.js
```

`leadDir(root, id) → <root>/leads/<id>` lives in `lib/registry.mjs` and is the
only place the layout is encoded.

## Discovery

`/new-lead` diffs `readdir(<root>/leads)` against `leads.json`:

| State | Condition | Offer |
| --- | --- | --- |
| new | folder present, no registry entry | adopt, then run the chain |
| WIP | entry present, one of `ARCHITECTURE.md` / `estimation.json` / `proposal.md` missing | resume at the first gap |
| done | entry present, all three present | nothing; re-run any named step on request |
| orphan | entry present, folder gone | report only — never auto-delete |

Invocation forms:

- `/new-lead @leads/acme-corp/` — target that folder.
- `/new-lead` — print the state table, the human picks.
- No `leads.json` found walking up — confirm, then `init-root.mjs` at cwd.

## Adoption

Runs once, when a folder has no registry entry.

1. The folder name must match `ID_RE` (`^[a-z0-9]+(-[a-z0-9]+)*$`). It does not
   → refuse, print the exact `mv` to run, write nothing.
2. Ask two questions, both skippable:
   - client name — skipped writes `null`
   - project name — skipped writes Title Case of the folder name
3. Both answered and the folder is not already named
   `<kebab(client)>-<kebab(project)>` → suggest one rename to exactly that.
   Accepted → `git mv` (plain `mv` outside a repo). Declined, or a folder of that
   name already exists → keep the current name and do not ask again.
4. Write the registry entry — *after* any rename, so the id can never name a
   folder that no longer exists.
5. Commit.

Uniqueness needs no enforcement: `id` is the folder name, and a directory cannot
hold two entries with the same name. The old `-2` / `-3` collision suffixing is
deleted; `validateRegistry`'s duplicate-id check stays as a guard against a
hand-edited registry.

## Chain

For each step, `cd` to `leadDir`, invoke the skill, stop when it returns, report
what was written, and wait for the human before continuing.

```
/analyze-requirements → ARCHITECTURE.md + its viewer
/estimate             → estimation.json + estimate.html
/proposal             → proposal.md + proposal.html → sync registry
start.sh              → report the dashboard URL
```

Each skill runs standalone: its own interview, its own validate loop, its own
render and serve. `/new-lead` never reads or writes their inputs.

### Registry sync

All three synced fields land after `/proposal`, not `/estimate` — `/estimate`
emits several scenarios and picks none; the pick is `/proposal`'s interview §1.5.

| Field | Source |
| --- | --- |
| `scenario` | `proposal-figures.json` `.scenario` |
| `value` | `.cost.low` / `.cost.high`, currency from `proposal.md` frontmatter |
| `client` | `proposal.md` frontmatter, only when the entry's `client` is still `null` |

## Phase 0 — rename `arch-docs` to `analyze-requirements`

Mechanical. The frontmatter `description` is untouched, so the skill keeps
triggering on "architecture docs", "C4 diagrams", "document this codebase".

1. `git mv plugins/solution-architect/skills/arch-docs …/analyze-requirements`
2. `SKILL.md` frontmatter `name: analyze-requirements`
3. Sweep the string in:
   - `estimate/scripts/render.mjs`, `estimate/scripts/test/*.mjs` (4 imports)
   - `proposal/scripts/render.mjs`, `lib/checks.mjs`, `test/checks-doc.test.mjs` (6 imports)
   - `analyze-requirements/scripts/test/*.mjs` — spawned literal paths
   - `tests/cli.test.mjs` — 10 installer assertions
   - `README.md` and the three sibling `SKILL.md` / `README.md` cross-references

Deliberately **not** renamed:

- `localStorage['arch-docs-theme']` in `viewer-template.html` — changing it
  silently resets every existing reader's light/dark choice.
- `likec4-config.mjs:30` project name, `research.js:2` workflow name — internal
  identifiers, never surfaced.
- **`ARCHITECTURE.md`** — `/proposal` hard-requires that exact filename
  (`proposal/SKILL.md:18`) and `map.mjs` probes for it. Renaming the skill must
  not rename its output.

Skills are auto-discovered from `skills/`; no manifest entry lists them.

## Phase 1 — workspace layout

| File | Change |
| --- | --- |
| `lib/registry.mjs` | add `leadDir(root, id)`; `validateLead` accepts `client: null` while still rejecting `""` |
| `init-root.mjs` | build `leads/` and `scripts/{lib,vendor}/`; `start.sh` alone at root, invoking `scripts/serve.mjs` |
| `lead-upsert.mjs` | `DEFAULTS` gains `client: null` |

## Phase 2 — dashboard repath and rewire

| File | Change |
| --- | --- |
| `serve.mjs` | `serveFile` → `scripts/*.html`; allowlist `/scripts/vendor/` and `/scripts/stats.mjs`; `DIST_RE` → `^/leads/(id)/dist/`; `apiNotes` and `buildLeadMap` via `leadDir` |
| `lib/map.mjs` | drop `new-lead-answers.json`; drop `interviewNode` and its edges; `evidenceNodes` from `readdir(leadDir)` minus the generated set; `facts` from the registry entry and `estimation.json` |
| `lib/enrich.mjs` | `join(root, id)` → `leadDir` |
| `index.html` | render `—` for a null client, sort nulls last; doc hrefs → `/leads/<id>/dist/…` |
| `detail.html` | rebuild `renderFacts` on registry facts; vendor src → `/scripts/vendor/…`; drop the `panels.facts?.proposal?.validityDays` branch — `map.mjs` never set `facts.proposal`, so it is already dead |

Evidence nodes now come from the filesystem rather than an interview
transcript, which matches the new model: the documents in the folder *are* the
evidence. The generated set excluded from that listing is `ARCHITECTURE.md`,
`estimation.md`, `estimation.json`, `estimation-inputs.json`, `proposal.md`,
`proposal-figures.json`, `notes.md`, `brief.md`, `*.c4`, `dist/`, and any
dotfile. Everything else in the lead directory is evidence.

## Phase 3 — the launcher

Rewrite `new-lead/SKILL.md` and `README.md` to the flow above.

Delete, now unreachable:

- `new-lead/references/interview.md`, `workflows.md`, `answers-schema.md`,
  `review-lenses.md` (643 lines)
- the `Orchestrated mode` section of `analyze-requirements/SKILL.md`,
  `estimate/SKILL.md`, `proposal/SKILL.md` — each activates only when handed a
  `new-lead-answers.json`, which nothing produces any more

`/new-lead` also stops doing: the evidence scan (each skill scans for itself),
`brief.md` (written by the gates' brief-writer prompt), all rendering, and
`resumeFromRunId` failure handling.

## Verification

Every phase is RED first and committed green before the next.

| Phase | Test |
| --- | --- |
| 0 | the existing suite, unchanged, after the sweep |
| 1 | `registry.test.mjs` — `client: null` accepted, `client: ""` rejected; `init-root.test.mjs` — the new tree, stamps still refresh; `lead-upsert.test.mjs` |
| 2 | `serve.test.mjs` — `/`, `/detail/<id>`, `/leads/<id>/dist/x.html`, `/scripts/vendor/…` serve, while `/leads.json` and `/scripts/lib/registry.mjs` are refused; `map.test.mjs` — no interview node, evidence from real files, facts from the registry; `enrich.test.mjs`; `e2e-workspace.test.mjs` |
| 3 | manual — `init-root` into a scratch dir, create a folder under `leads/`, run bare `/new-lead`, confirm it reports `new` and adopts correctly |

## Out of scope

- **No migration for existing flat-layout roots.** `init-root.mjs` builds the new
  shape; an old root still resolves via `findLeadsRoot`, but its dashboard breaks.
  Nobody outside this repo has such a root yet.
- **No root-level `dist/`.** Each lead keeps its own.
- **No change to any sub-skill's interview, validation, or output contract**
  beyond removing `Orchestrated mode`.
