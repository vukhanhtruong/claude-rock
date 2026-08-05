# Estimate skill — roadmap/milestones design

Date: 2026-08-05
Status: approved (brainstormed with user)

## Problem

The estimate deliverable answers "how much, how long" but shows no delivery
shape. Clients reading a pre-sales estimate want the big picture: what lands
first, what comes after, roughly when. A calendar schedule (dates, Gantt,
dependencies) would be false precision at ±50% estimates — but a **roadmap of
ordered milestones with relative month bands** claims only sequence and rough
size, which the evidence supports.

## Decisions (user-confirmed)

1. **Milestone shape**: optional `milestone` string field on each feature in
   `estimation-inputs.json` (e.g. `"milestone": "M1 - Booking core"`).
   Features sharing a label form one milestone. Milestone order = order of
   first appearance in the `features` array. No new top-level structure.
2. **Optionality**: all-or-nothing. If any feature carries `milestone`, all
   must (schema finding otherwise). No milestones → no roadmap anywhere, and
   the deliverable stays valid. Existing inputs keep validating unchanged.
3. **Band math**: sequential, proportional. Milestones deliver one after
   another by the recommended scenario team. A milestone's width = its share
   of that scenario's AI-adjusted task hours × the scenario's total months —
   overhead and buffers spread proportionally, bands sum to scenario months
   exactly.
4. **What-if interaction**: none. The roadmap section renders committed
   numbers only, like every other main section — the what-if sandbox stays
   confined to the sticky rail (existing page principle). Scenario cards
   likewise stay frozen.

## Components

### 1. `estimate-math.mjs` — new pure function

```js
roadmapBands({ milestones, months })
// milestones: [{ name, hours }] in delivery order; months: scenario total
// returns [{ name, startMonths, endMonths }]
// width = hours share × months; bands tile [0, months] with no gaps
```

Lives in `estimate-math.mjs` so the browser inlines the same formula via the
existing MATH slot (no drift between committed numbers and page).

### 2. `schema.mjs` — all-or-nothing check

If some but not all features have `milestone`, push a finding naming the
features missing it. `milestone`, when present, must be a non-empty string.

### 3. `rollup.mjs` — roadmap block per scenario

When milestones are present, each `scenarioBlock` gains:

```json
"roadmap": [
  { "milestone": "M1 - Booking core", "features": ["booking"],
    "startMonths": 0, "endMonths": 2.5 }
]
```

round2 applied; hour shares use that scenario's AI-adjusted `taskHours` (a
boilerplate-heavy milestone correctly shrinks more on AI plans). No
milestones → no `roadmap` key (absent, not empty array).

### 4. `estimation.md` contract (`writing.md` + `checks.mjs`)

New subsection in Summary after the buffer table, present iff inputs have
milestones:

```markdown
### Roadmap

| Milestone | Features | Months (from start) |
| --- | --- | --- |
| M1 - Booking core | User can book appointment | 0–2.5 |

Sequential delivery by the recommended scenario team. Bands are relative
months, not calendar dates. Ordering: proposed.
```

Validator rules:

- inputs have milestones → `### Roadmap` heading required in Summary, its
  table ≥ 1 row, and a prose line matching `/not calendar dates/i` (the
  honesty guard).
- inputs have no milestones → `### Roadmap` heading must be absent.
- Numbers trace to `computed.scenarios[recommendedScenario].roadmap` —
  covered by the existing recompute rule (rule 12).

The ordering-provenance line says `proposed` unless the client stated the
order (then `stated`).

### 5. `estimate-template.html` — roadmap section

New `<section id="roadmap">` between `#cost-bars` and `#timeline`.
`renderRoadmap()` draws one row per milestone: label + month range, filled
band positioned on a shared month axis (reuse existing bar/track visual
language), feature names as a dim sub-line, month ticks at the bottom.
Renders from `DATA.computed.scenarios[recommended].roadmap` — static,
ignores sliders. Section absent (no placeholder) when no roadmap data.
Visible in client view. **Implementation must invoke the
`design-taste-frontend` skill before touching the template** (user request).

### 6. Interview + docs

- `interview.md`: at STANDARD/DEEP, after scope confirmation, one question —
  agent proposes a milestone grouping, user confirms or reorders. Ordering
  provenance recorded (`proposed` unless client stated it).
- `writing.md`: §1 inputs shape (milestone field + all-or-nothing), §2
  skeleton (Roadmap subsection), §3 contract rules appended.
- `booking-inputs.json` fixture gains milestones (stays the canonical
  shape); a milestone-free fixture pins the optional path.
- `estimation-pass.md` fixture gains the Roadmap subsection.

## Error handling

- Partial milestones → schema finding (compute refuses, exit 1).
- Roadmap section present in md but no milestones in inputs (or vice versa)
  → validate/render finding, page refuses to ship.
- Single milestone → one full-width band, valid.

## Testing (TDD, existing node:test suites)

- `estimate-math.test.mjs`: `roadmapBands` sums to months exactly, preserves
  order, single-milestone case, zero-gap tiling.
- `schema.test.mjs`: some-but-not-all milestones → finding; all/none → clean.
- `compute.test.mjs`: roadmap block present with milestones, absent without;
  per-scenario shares differ under AI plans.
- `validate.test.mjs`: the four md/inputs presence combinations.
- `render.test.mjs` / `browser.test.mjs`: section renders with data, absent
  without; client view keeps it.

## Out of scope (YAGNI)

Calendar dates, task dependencies, parallel tracks, per-milestone cost
split, Gantt charts, live roadmap under sliders, pinning slider state as a
new scenario.
