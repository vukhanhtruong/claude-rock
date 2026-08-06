# Writing — frontmatter contract, ten sections, language rules

Read while writing proposal.md. The validator enforces everything below;
a document that satisfies this file passes `validate.mjs` by construction.

## 1. Frontmatter (flat keys — the shared parser is flat key:value)

```yaml
---
client: Acme Corp
client_tech_level: non-tech      # non-tech | low-tech | technical
scenario: 2eng-max5x             # must exist in estimation.json
currency: USD
valid_until: 2026-09-06          # ISO date, must be in the future
jargon_allow: []                 # optional, JSON array
source_architecture: ../ARCHITECTURE.md
source_estimation: ../estimation.json
---
```

## 2. Numbers — the one rule that matters most

**Never write a number that `scripts/derive.mjs` did not output.** Run it
first, keep proposal-figures.json open, and use only those values: the cost
range, the duration range, and the per-milestone splits. Money is written
`$8,000` (en-US grouping); durations are written `1.6–2.4 months`. The
validator extracts every money amount and duration (ranges and single
mentions) in the document and refuses any value the derivation didn't
produce — and it recomputes the
figures from estimation.json itself, so editing proposal-figures.json by
hand changes nothing.

Rates never appear. Team members are described by role/seniority only.

## 3. The ten sections, in order (all `##`, exact names)

1. **Executive Summary** — problem, solution, headline cost range, headline
   duration range. One page. The headline ranges are mandatory: the
   validator requires cost low/high and months low/high to appear.
2. **Background & Objectives** — the client's problem in their words, then
   measurable goals.
3. **Proposed Solution** — what we build, in the client's language, plus
   exactly the depth the tech level allows (see §4). Must contain one
   `mermaid` code fence — non-tech gets boxes-and-arrows with ≤ 6 nodes.
4. **Scope** — in-scope features as a table, phrased as client outcomes.
   More than ~8 rows: split into several tables grouped under `###`
   subheads named after product areas the client recognizes. `###` lines
   do not break section slicing; each table still validates on its own.
5. **Out of Scope & Assumptions** — explicit exclusions (from estimation.md
   plus the interview) and the assumptions the estimate rests on.
6. **Delivery Approach** — milestones with their duration ranges, ways of
   working, QA, communication cadence, and the client-relevant risks with
   mitigations. The full risk register stays internal.
7. **Investment & Timeline** — the milestone table: Duration and Investment
   columns from the figures, then the bold total line and the sentence
   explaining the range reflects estimation confidence.
8. **Team** — roles from the chosen scenario's team (seniority, count),
   never rates.
9. **About <firm>** — blurb, relevant work, contact, from the profile. The
   jargon scan skips this section.
10. **Next Steps** — the valid_until date in prose, the acceptance path,
    and a call to action.

## 4. Tech-level language

- **non-tech** — plain words only; analogies over architecture; the
  deny-list (scripts/lib/jargon.mjs — e.g. api, kubernetes, backend) fails
  validation outside About. Diagram shows what the client sees, not
  containers.
- **low-tech** — everyday product vocabulary is fine (website, app,
  database); no infrastructure or tooling terms.
- **technical** — full stack detail welcome; the diagram may show
  containers and technology labels.

## 5. What must never appear

Other scenarios (ids, names, or comparisons), provenance vocabulary
(`observed`/`stated`/`researched`/`proposed` as table cells or a `src`
column), `data-internal`, placeholder text of any spelling, empty tables,
and any number the derivation didn't produce — all of these fail
`validate.mjs`. Rates, internal risk ids, and confidence internals must
never appear either, but no script can recognize them reliably: the
fresh-eyes review (`references/review.md` charter item 4) and your own
read before rendering are the gate for those. Unknowns are honest
absences — if something isn't known, say so in plain words or leave it
out.

## 6. Placement + commands

proposal.md, proposal-figures.json beside ARCHITECTURE.md/estimation.md.
Run from `plugins/solution-architect/skills/proposal/`:

```
node scripts/derive.mjs   --estimation <dir>/estimation.json --scenario <id> --out <dir>/proposal-figures.json
node scripts/validate.mjs --md <dir>/proposal.md --estimation <dir>/estimation.json
node scripts/render.mjs   --md <dir>/proposal.md --estimation <dir>/estimation.json --mermaid-bundle <path> --out <out-dir>
node ../arch-docs/scripts/serve.mjs <out-dir>
```

`<out-dir>` is the rendered arch-docs viewer directory when one exists
(proposal.html ships beside index.html and estimate.html), else `<dir>`.
