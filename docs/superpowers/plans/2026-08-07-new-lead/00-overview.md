# /new-lead Orchestrator + Leads Dashboard — Implementation Plan (Overview)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `/new-lead` skill that orchestrates arch-docs → estimate → proposal via three dynamic workflows with per-document human gates, plus a self-contained leads workspace (registry, server, dashboard, lead-detail lineage view).

**Architecture:** A new `new-lead` skill in the `solution-architect` plugin drives one combined staged interview, then launches one Workflow per document with review-panel + verify-then-fix stages; the main loop holds the gates. A leads-root directory (marker: `leads.json`) holds one dir per lead plus copies of a dependency-free Node server and dashboard pages; the server enriches the registry from disk truth and persists won/lost via atomic writes.

**Tech Stack:** Node ≥ 20 (`node:http`, `node:test`, no runtime npm deps), vanilla HTML/JS dashboard, React Flow vendored as a single esbuild bundle (build-time only), existing skill scripts (`compute.mjs`, `derive.mjs`, `validate.mjs` per skill).

**Spec:** `docs/superpowers/specs/2026-08-07-new-lead-design.md` — read it before any milestone.

## Global Constraints

- Node ≥ 20; all runtime scripts dependency-free (no `node_modules` at runtime). The only npm usage is the one-off React Flow bundle build (milestone 04).
- Lead ids and dir names: kebab-case `^[a-z0-9]+(-[a-z0-9]+)*$`.
- `leads.json` is business metadata only; generation truth is `new-lead-answers.json` per lead. Agents never generate documents from the registry.
- Registry writes: lockfile `leads.json.lock` + write-temp-then-rename. Never write `leads.json` directly.
- Dashboard/server files copied into leads-root carry a version stamp line `new-lead-dashboard v<N>`; refresh copies only when the skill asset's stamp is newer.
- Headless-mode edits to arch-docs/estimate/proposal SKILL.md are **additive only** — zero edits to existing lines.
- **Card-detail mockup must be shown to the user and approved before implementing `detail.html`** (milestone 04, hard gate).
- Run `/simplify` on changed code before **every** code commit (docs-only commits exempt).
- TDD (RED-GREEN-VALIDATE) for every script; tests with `node --test`.
- Quality gates: ≤ 20 lines/function, ≤ 3 params, ≤ 2 nesting levels, ≤ 200 lines/file (code files; SKILL.md/references exempt), coverage ≥ 80% on scripts.
- Commits: Conventional Commits, no AI attribution trailers.
- Dashboard and detail pages are built through the `design-taste-frontend` skill; self-contained; light + dark themes.
- Server default port: 4600.

## Milestones

| # | File | Delivers | Depends on |
|---|------|----------|-----------|
| 01 | `01-registry-and-init.md` | `lib/registry.mjs`, `validate.mjs` CLI, `init-root.mjs`, `start.sh` | — |
| 02 | `02-dashboard-server.md` | `serve.mjs`, `lib/enrich.mjs`, `lib/map.mjs` (lead-map + panels) | 01 |
| 03 | `03-dashboard-ui.md` | `index.html` (cards/timeline/wall + stats + won-lost) | 02 |
| 04 | `04-lead-detail.md` | mockup → **user approval gate** → vendor bundle → `detail.html` | 02, 03 |
| 05 | `05-headless-mode.md` | Orchestrated-mode sections in the three existing skills | — |
| 06 | `06-new-lead-skill.md` | `new-lead` SKILL.md + references (interview, workflows, lenses) | 01, 05 |
| 07 | `07-e2e-verification.md` | Fixture end-to-end + live-run checklist | all |

Execution order: 01 → 02 → 03 → 04, with 05 parallelizable anytime; 06 after 01+05; 07 last.

## Shared file layout (source of truth)

```
plugins/solution-architect/skills/new-lead/
├── SKILL.md                      (milestone 06)
├── references/
│   ├── interview.md              (06)
│   ├── workflows.md              (06)
│   └── review-lenses.md          (06)
├── scripts/
│   ├── serve.mjs                 (02)
│   ├── init-root.mjs             (01)
│   ├── validate.mjs              (01)
│   └── lib/
│       ├── registry.mjs          (01)
│       ├── enrich.mjs            (02)
│       └── map.mjs               (02)
├── scripts/test/                 (node --test files + fixtures)
└── assets/
    ├── dashboard/
    │   ├── index.html            (03)
    │   ├── detail.html           (04)
    │   ├── start.sh              (01)
    │   └── vendor/reactflow-bundle.js  (04, committed artifact)
    └── vendor-build/             (04: entry.jsx, package.json — build-time only)
```

Copied into `<leads-root>/` on init/refresh: `serve.mjs`, `lib/*.mjs`, `index.html`, `detail.html`, `vendor/reactflow-bundle.js`, `start.sh`.

## Interface registry (cross-milestone contracts)

```js
// lib/registry.mjs                                            (01)
findLeadsRoot(startDir) -> string | null
readRegistry(root) -> Promise<{version: 1, leads: Lead[]}>
writeRegistry(root, registry) -> Promise<void>   // validates, locks, atomic
validateRegistry(registry) -> string[]           // findings; [] = valid

// Lead (leads.json entry)
{ id, client, title, status: 'active'|'won'|'lost',
  created: 'YYYY-MM-DD', closed: string|null,
  value: null | {low: number, high: number, currency: string},
  scenario: string|null }

// lib/enrich.mjs                                              (02)
enrichLead(root, lead) -> Promise<Lead & {
  artifacts: {docs: boolean, estimate: boolean, proposal: boolean},
  hasBrief: boolean, hasNotes: boolean }>

// lib/map.mjs                                                 (02)
buildLeadMap(root, id) -> Promise<{
  nodes: RFNode[], edges: RFEdge[],
  panels: { brief: string|null, facts: object, risks: string[],
            openQuestions: string[], activity: string[] } }>
// RFNode: {id, type: 'evidence'|'interview'|'doc'|'component'|'scenario',
//          position: {x, y},
//          data: {label, status: 'ready'|'pending', href: string|null, detail: string|null}}
// RFEdge: {id, source, target}

// scripts/init-root.mjs                                       (01)
initRoot(root, assetsDir) -> Promise<{created: boolean, copied: string[]}>

// HTTP API (serve.mjs, port 4600)                             (02)
GET  /                       -> index.html
GET  /detail/:id             -> detail.html
GET  /api/leads              -> {version, leads: EnrichedLead[]}
GET  /api/leads/:id/map      -> lead map JSON (buildLeadMap output)
POST /api/leads/:id          -> body {status, closed?} -> updated lead JSON
POST /api/leads/:id/notes    -> body {content} -> {ok: true}
GET  /<lead>/dist/*          -> static, traversal-guarded

// new-lead-answers.json (schema v1, defined fully in 06)
{ version: 1, lead: {...}, evidence: {...}, client: {...}, scope: {...},
  tech: {...}, delivery: {...}, proposal: {...}, decisions: [] }
```
