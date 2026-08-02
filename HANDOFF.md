# Handoff — architecture documentation plugin

**Written:** 2026-08-02 · **From:** a brainstorming session held in `~/WIP/mine/boilerplate-scout`
**To:** a fresh session in `~/WIP/mine/claude-rock`
**Status:** brainstorming ~60% done. Design not yet written, no spec, no code.

This project is **totally separate from `boilerplate-scout`**. That repo was only the
session's working directory; nothing is shared, imported, or depended on. Where its
patterns are worth copying, this document says so explicitly.

---

## 1. What is being built

A Claude Code plugin that runs a structured interview plus live research, then writes
professional architecture documentation with real diagrams — and serves it on
`localhost:<port>` for review.

It replaces the existing `plugins/architecture-design` (v2.0.1) in this repo.

**Why replace rather than extend.** The legacy plugin's gaps are the whole point of the
rewrite:

| Legacy behaviour | Problem |
|---|---|
| Interview only, 5–7 questions | No research. Claude invents the domain and the stack |
| Python scripts template diagrams from JSON | Worse than what the model writes directly |
| *"Use placeholders to maintain momentum"*, `[TODO]`, validator *counts* placeholders | Unknowns render as filler. Normalised dishonesty |
| References limited to Node/Python/Java, monolith/microservices/serverless | Not agnostic. No ML, AI/LLM, mobile, embedded, CLI, game |
| No viewer, no ADRs, no estimation | — |

---

## 2. Target location and the wipe

Repo: `~/WIP/mine/claude-rock` — a plugin **marketplace**
(`.claude-plugin/marketplace.json`, `plugins/<name>/`, `bundle.sh`, `build/`).

Instructions from the user:

- new branch **`develop`**
- **"wipe out all legacy plugin"**
- new plugin lives in `plugins/<new-name>/`

> ### ⚠️ MUST CONFIRM BEFORE DELETING ANYTHING
> Three plugins exist today: `architecture-design`, `browser-devtools`, `devops`.
> "All legacy plugin" is ambiguous — it may mean all three, or only
> `architecture-design`. **Ask before removing any of them.** `browser-devtools` and
> `devops` are unrelated to this work and have their own README/ZIP links from the
> root README and `build/`. Deleting them also invalidates marketplace entries and
> published download links.

Repo conventions to follow (from its root `README.md`):

```
plugins/<plugin>/skills/<skill>/
├── SKILL.md      # implementation
├── README.md     # user-facing
├── assets/       # templates
├── references/   # loaded on demand
└── scripts/
```

kebab-case dirs; `.claude-plugin/marketplace.json` needs a new entry; `./bundle.sh
<plugin>` produces `build/<plugin>.zip`.

---

## 3. Decisions locked in this session

| # | Decision | Reason |
|---|---|---|
| 1 | **One skill, mode auto-detected** — greenfield (design) vs brownfield (document) | Detect from whether the target has code |
| 2 | **Provenance per fact:** `observed` (scanned from code) · `stated` (human said it) · `researched` (agent, with source) · `proposed` (agent designed it) | A claim nobody verified must never render like one that was |
| 3 | **One home per fact: diagrams own topology, tables own properties, prose owns neither** | Kills the duplication and bloat that makes generated arch docs unreadable |
| 4 | **Elimination criterion:** if an agent can read a fact from a config file faster than from the doc, the doc must not carry it | Killed 9 fields |
| 5 | **arc42 spine + 2 additions, own vocabulary** | arc42 order narrows why→what→how; arc42 lacks a directory-tree section, which is the most useful one for an agent |
| 6 | **`DOMAIN.md` is NOT created** — write `CONTEXT.md` / `CONTEXT-MAP.md` in mattpocock's existing format | See §6 |
| 7 | **ADRs: `docs/adr/NNNN-slug.md`**, mattpocock's three-part gate, but *always* include Considered Options | See §6 |
| 8 | **Project Structure is brownfield-only** | Greenfield: the scaffolder owns the tree. Renders as a stated absence, never a fabricated tree |
| 9 | **Deployment = LikeC4 deployment view + per-env table; CI/CD is a table, not a diagram** | A linear pipeline flowchart adds nothing over a numbered table |
| 10 | **Table columns vary by project type** | This is the mechanism that makes "agnostic" real rather than a claim |

### 3.1 Document spine — 16 headings, 2 conditional, ~14 typical

```
frontmatter: name · repo · team · updated · mode · projectType · docVersion · electedDocs

 1  Goals & Scope
 2  Constraints
 3  Project Structure          ← BROWNFIELD ONLY. generated from fs, depth ≤2,
                                 boundary map (what rule sends a new file here)
 4  Solution Strategy          ← ≤5 bullets, each links an ADR. never restates rationale
 5  Architecture Model         ← LikeC4 C1/C2/C3. no prose
 6  Core Components            ← table: responsibility, tech, deploy unit, key paths,
                                 context, invariants enforced
 7  Runtime Behaviour          ← 2–4 mermaid sequences, named flows only
 8  Data Stores                ← mermaid ER + table (type, purpose, retention, PII, migration tool)
 9  External Integrations      ← table only: method, auth + where the credential lives,
                                 failure mode, rate limit/cost, data leaving the boundary, lock-in
10  Deployment & Infrastructure ← LikeC4 deployment view + per-env table + CI/CD stage table
11  Crosscutting Concepts      ← observability, error handling, validation, config/secrets,
                                 auth *mechanics*, testing strategy
12  Security                   ← mermaid DFD + trust boundaries, authz *model*, link to threat model
13  Quality Requirements & SLOs
14  Decisions                  ← generated index table of docs/adr/. zero authoring cost
15  Risks & Technical Debt
16  Glossary                   ← generated from CONTEXT.md. omitted if <5 terms, and says so
```

**Cut, with reasons:** Project Identification → frontmatter (name is in the manifest, URL
in the git remote) · Roadmap → the estimation doc (it duplicated it) · Development &
Testing → three pointers, all readable from the repo faster · separate System Diagram →
merged into Architecture Model · design-doc/RFD → redundant once CONTEXT.md + ADRs exist.

**Contested facts, resolved to one home:** observability → Crosscutting · auth *mechanics*
→ Crosscutting, auth *model* → Security · threat list → the threat-model doc, not §12 ·
decision rationale → ADR files, not §4 · technical debt → §15, not a roadmap.

**One distinction to keep in the contract:** the ER diagram is **not** the domain model.
ER = persistence shape. Domain = concepts, language, invariants. They legitimately differ
(event sourcing, CQRS, read models). Two diagrams, two homes.

### 3.2 Companion documents

Always: **ADRs**. Elected: **threat model**, **interface contract**, **estimation**.
Plus **CONTEXT.md / CONTEXT-MAP.md** written into an existing convention (§6).

Election is by project type / domain complexity, and **a doc not elected is recorded as
not-elected with the reason — never silently absent.**

| Project type | threat model | interface contract |
|---|---|---|
| Web / SaaS | STRIDE | OpenAPI |
| AI / LLM app | **OWASP Top 10 for LLM 2025** | OpenAPI + tool schemas |
| ML / data pipeline | data lineage, PII | data contracts; **+ model card + dataset datasheet** |
| Mobile | device + transport | consumes only |
| CLI / library | usually none | public API surface |
| Embedded / IoT | physical + firmware | wire protocol |

Estimation is **not** part of any architecture standard (checked arc42, ISO 42010, C4,
design-doc practice). Kept because the user asked for it, as a separate labelled
non-architecture doc. Every estimate carries confidence + the assumptions it rests on;
an unestimated component reads "not estimated", never `0`.

---

## 4. Research findings

| Finding | Source |
|---|---|
| **arc42** — 12 sections, one document, since 2005. Its gaps vs. the user's template: Goals, Constraints, Solution Strategy, **Runtime View** (template had *no* dynamic view), Crosscutting Concepts, Quality Requirements, Risks-separate-from-Roadmap | [arc42.org/overview](https://arc42.org/overview) |
| **ISO/IEC/IEEE 42010** *requires* that decisions **and their rationale** be documented, explicitly including alternatives **not** chosen. This is why ADRs are not optional | [iso.org/standard/50508](https://www.iso.org/standard/50508.html) · [42010 conceptual model](http://www.iso-architecture.org/42010/cm/) |
| ADR templates: Nygard 2011, MADR, Y-statement, Tyree-Akerman | [adr.github.io](https://adr.github.io/) |
| Design docs / RFDs are *pre-decision and arguing*; an architecture doc is *post-decision and stating*. Oxide: "timely rather than polished" | [Design Docs at Google](https://www.industrialempathy.com/posts/design-docs-at-google/) · [Oxide RFD 1](https://rfd.shared.oxide.computer/rfd/0001) |
| Threat-model deliverable = DFD + **trust boundaries as dotted lines** + threat list + mitigations/assumptions | [OWASP practical threat modeling](https://devguide.owasp.org/en/04-design/01-threat-modeling/07-practical-threat-modeling/) |
| OWASP Top 10 for LLM Apps 2025: prompt injection #1, sensitive info disclosure #2, supply chain, data/model poisoning, improper output handling, excessive agency, system prompt leakage, vector/embedding weaknesses | [genai.owasp.org](https://genai.owasp.org/resource/owasp-top-10-for-llm-applications-2025/) |
| Model cards (Mitchell et al. 2019, the Hugging Face standard) + Datasheets for Datasets + Data Cards | [HF model-card landscape](https://huggingface.co/docs/hub/en/model-card-landscape-analysis) |
| AsyncAPI 3.x = "communication contract between senders and receivers" for event-driven | [asyncapi.com](https://www.asyncapi.com/docs/concepts/asyncapi-document) |
| Google SRE: SLOs, PRR, launch checklist, runbook. **Verdict:** fold SLOs into Quality Requirements; cut runbook/PRR as post-launch | [sre.google](https://sre.google/sre-book/evolving-sre-engagement-model/) |

### 4.1 Visualization facts

**LikeC4** — npm package `likec4`. Verified capabilities:

| Command | Output |
|---|---|
| `likec4 start` / `serve` / `dev` | dev server, hot reload, scans `*.c4` / `*.likec4` |
| `likec4 build` | static offline site; `viteSingleFile` can make one portable HTML |
| `likec4 gen webcomponent` | **framework-free `<c4-view>` bundle — embeddable in a plain offline HTML page.** `--webcomponent-prefix` configurable |
| `likec4 gen react` | React components |
| `likec4 gen mmd` / `dot` / `d2` / `plantuml` | other diagram syntaxes |
| `likec4 export png/jpg/json/drawio` | Playwright-based screenshots, JSON dump |
| `likec4 validate` | syntax + layout drift, exit 1 on error |

**LikeC4 has a native deployment model** — `deploymentNode` kinds in the `specification`
block, `instanceOf` to place logical containers onto nodes, `deploymentView` using the
same predicates as model views. Because `instanceOf` reuses the *same* container objects
from the C2/C3 views, deployment topology cannot contradict the logical model — and it
yields a validator check: **any container with no `instanceOf` anywhere is undeployed.**

Sources: [cli](https://likec4.dev/tooling/cli/) · [deployment model](https://likec4.dev/dsl/deployment/model/) · [deployment views](https://likec4.dev/dsl/deployment/views/) · [npm](https://www.npmjs.com/package/likec4)

**LikeC4 ships its own agent skill** at `likec4/likec4` → `skills/likec4-dsl/` (includes
`references/troubleshooting.md`). Check it before writing any LikeC4 DSL guidance —
cheaper and more current than authoring our own.

**`likec4` needs Node + an npm install. This is the design's one hard dependency.**

**archify** ([tt-a1i/archify](https://github.com/tt-a1i/archify)) — the reference the user
gave for "beautiful diagrams". Important correction: **archify does not use Mermaid.** It
uses a typed JSON IR with custom rendering, explicitly *"layout judgment over generic
auto-layout"*, self-contained HTML output, 4 visual presets, dark/light, pan/zoom,
semantic search, upstream/downstream reach tracing, deep-linking. So *"mermaid but
beautiful like archify"* is in tension — mermaid's auto-layout is precisely what archify
avoids. **This trade-off is unresolved (see §7).**

---

## 5. Validator — the differentiator

No architecture-doc tool found does cross-consistency checking. Planned checks:

| Check | Fails when |
|---|---|
| Table ↔ model agreement | an external system in the table isn't in the LikeC4 model, or vice versa; same for components and for stores vs. ER entities |
| Undeployed container | a logical container has no `instanceOf` in any deployment node |
| Cluster drift *(brownfield)* | a documented component matches no detected code cluster, or a high-cohesion cluster has no section |
| Tree drift *(brownfield)* | documented directory boundary map ≠ actual filesystem |
| Provenance completeness | any fact rendered without a provenance tag |
| Election record | an un-elected companion doc with no recorded reason |

**Not** a placeholder counter. `[TODO]` is not a rendering state — an un-designed section
renders as un-designed, loudly.

---

## 6. Existing tooling — integrate, do not duplicate

| Tool | Status | What to do |
|---|---|---|
| **`mattpocock-skills:domain-modeling`** (installed, active) | Owns `CONTEXT.md` (glossary only — *"totally devoid of implementation details"*, format `**Term**:` + definition + `_Avoid_: synonyms`) and `CONTEXT-MAP.md` (contexts + relationships, only when ≥2). Also `docs/adr/NNNN-slug.md`, minimal format, gate = hard-to-reverse **and** surprising **and** a real trade-off | **Write into these formats. Do not invent `DOMAIN.md`.** Generate ARCH §16 Glossary from `CONTEXT.md`. It is an *interactive discipline* (challenge terms, invent edge scenarios, cross-reference code) — **invoke it during the domain interview** rather than reimplement |
| **`codebase-memory-mcp` → `get_architecture`** | Returns packages, services, dependencies, plus **Leiden community-detection clusters** = "de-facto modules… **which often cut across the folder layout**" (label, member count, cohesion score, top_nodes) | **Brownfield §6 Core Components is seeded from clusters, not folder names.** Also powers the cluster-drift check |
| **`codebase-memory-mcp` → `manage_adr`** | A *third* ADR store (graph DB rows, modes get/update/sections) | **Read if present, never write.** An ADR in git is reviewable in a PR; a graph row isn't |
| **`understand-anything:understand-domain`** | Brownfield-only code scan → `.understand-anything/knowledge-graph.json` + its own dashboard flow graph. No markdown | Optional *input* when already run. Never a dependency |
| **`boilerplate-scout`** (`~/WIP/mine/boilerplate-scout`, separate repo) | Consumes a requirements doc, uses `docs/decisions/YYYY-MM-DD-slug.md` with `rejected` required | **Leave alone** — a scout record is a different artifact (dated because a re-run is a new decision). Optional downstream: this plugin's output can feed `/boilerplate-scout` its drivers |

### Patterns worth copying from `boilerplate-scout` (patterns, not code)

That repo is the same author's and is well built. Worth imitating:

- `SKILL.md` as prose with hard rules and a table per decision point; **`references/*.md` holding per-stage briefs that agents are told to follow** — keeps SKILL.md small
- `workflows/*.js` — a dynamic `Workflow` script with `phase()` / `pipeline()` / `parallel()`, JSON schemas per stage, and `log()` on every dropped item so a thin result can never present as a complete one
- `scripts/lib/*.mjs` — small, zero-dep, one concern each, `node --test`
- **The honest-missing invariant**: `unmeasured` (with a reason) is never rendered as `0`. This project's equivalent is the provenance model
- Failed search modalities are *named in the output* with their reason

Quality gates from the user's global `CLAUDE.md` apply: **≤200 lines/file, ≤20
lines/function, ≤3 params, ≤2 nesting levels, ≤10 functions/file, ≥80% coverage**, and
**TDD RED→GREEN→VALIDATE** — tests must fail first.

---

## 7. Open questions — resolve these next

1. **Wipe scope.** All three plugins, or only `architecture-design`? *(blocking, destructive)*
2. **Mermaid vs. archify-style rendering.** Styled mermaid + ELK layout + pan/zoom (portable — the fences stay readable on GitHub), or a custom JSON IR + renderer (best looking, big build, diagrams stop being portable text)? The user asked for mermaid *and* for archify's look; these pull apart.
3. **Viewer stack.** How LikeC4 + mermaid get served offline on `localhost:<port>`: vendor the `likec4 gen webcomponent` bundle into the plugin, run `npx likec4` on demand, or ship a prebuilt template that shells out at first run? Decides whether the plugin has an npm install step.
4. **Viewer port** — fixed default, or scan for a free one?
5. **Interview budget.** Legacy did 5–7 questions. The new spine needs roughly 3 more for Quality Requirements, plus domain questions. What's the ceiling before it's tedious?
6. **Research workflow shape.** Phases, agents per phase, cost per run. Sequence is settled: **domain research → stack research → per-aspect design**, because bounded contexts must constrain component boundaries.
7. **How far to take per-project-type profiles** — do sections themselves get added/dropped (ML gains Data & Lineage, mobile gains Offline & Sync, CLI drops Deployment), or only table columns?
8. **Does estimation stay?** It's the only deliverable with no standing in any standard.
9. **Plugin name.** `architecture-design` reused, or a new name?
10. **Consume LikeC4's own `likec4-dsl` skill?** Verify it exists and is usable first.

---

## 8. Next step

Brainstorming is unfinished. In the new session:

1. Confirm the wipe scope (Q1) — nothing gets deleted before that answer.
2. Settle Q2/Q3 (visualization + viewer stack) — they decide the plugin's dependencies.
3. Then the full design in one pass: interview → research workflow → provenance model →
   writers → viewer → validator → repo layout.
4. Spec to `docs/specs/YYYY-MM-DD-<topic>-design.md`, commit, user review.
5. Then, and only then, an implementation plan.

Do **not** start writing the plugin before the design is approved.
