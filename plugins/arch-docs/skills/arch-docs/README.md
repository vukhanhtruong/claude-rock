# arch-docs

Produce professional architecture documentation for any project, then serve it on
localhost as an interactive site for review.

## What it produces

**`ARCHITECTURE.md`** — a fixed 16-section spine (arc42 + 2 additions):

1. Goals & Scope
2. Constraints
3. Project Structure (brownfield only)
4. Solution Strategy
5. Architecture Model (LikeC4 C1/C2/C3 diagrams)
6. Core Components
7. Runtime Behaviour (LikeC4 dynamic views)
8. Data Stores (ER diagram + table)
9. External Integrations
10. Deployment & Infrastructure
11. Crosscutting Concepts
12. Security
13. Quality Requirements & SLOs
14. Decisions (index of ADRs)
15. Risks & Technical Debt
16. Glossary

**Companion documents** — always: ADRs under `docs/adr/`. Elected based on your
project (and recorded with a reason when skipped): `threat-model.md`, an interface
contract (OpenAPI, tool schemas, data contracts, or wire protocol depending on your
stack), `estimation.md`, and `DOMAIN-OVERVIEW.md` for domain-heavy projects.

Every fact in every doc is tagged with where it came from: `observed` (from your
code), `stated` (from you), `researched` (verified against a source), or `proposed`
(a suggestion). Nothing invented gets to look verified.

## Two modes

- **Brownfield** — the target already has source code. arch-docs scans it first and
  documents what's there.
- **Greenfield** — no code yet. arch-docs designs the architecture with you.

Mode is auto-detected from whether the target has code; you can override it.

## Dependency

Node ≥ 20 with npm, so `npx likec4` can render diagrams. arch-docs tells you this
upfront and stops before writing anything if it's missing.

## Install

```
/plugin marketplace add vukhanhtruong/claude-rock
/plugin install arch-docs@claude-rock
```

## Run it

Ask for any of:

- "document this codebase" / "generate architecture docs"
- "design the architecture for X"
- "add C4 diagrams" / "write ADRs" / "create a threat model"

## The viewer

After validation passes, arch-docs renders one self-contained HTML file — no CDN,
works offline — with the LikeC4 diagrams, ARCHITECTURE.md, and every companion doc,
and serves it on `localhost:4173` (or the next free port). You get zoom, pan, expand,
and fullscreen on every diagram, dark/light toggle, and deep links per section.

## Why the honesty rules

An architecture doc that guesses and hides the guess is worse than no doc — it looks
authoritative right up until someone relies on it. arch-docs marks every fact with
its source and renders what it doesn't know as a stated absence, never a placeholder.
