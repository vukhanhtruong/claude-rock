# Interview — evidence first, depth, gate, question sequence

Read during the interview phase (SKILL.md step 2). Defines what to pre-fill
before asking, what order to ask in, and the gate that stands between a scope
guess and a sized number.

## 1. Evidence detection table

Scan for evidence before asking anything. Each source pre-fills specific
fields and stamps them with a provenance label — carry that label straight
into `estimation-inputs.json`, never upgrade it on your own judgment.

| Source | Pre-fills | Provenance label |
| --- | --- | --- |
| Requirements doc / RFP / backlog | feature list, scope text, named deadlines | `stated` |
| `ARCHITECTURE.md` (companion mode) | tech stack, existing components, integration points | `stated` |
| Codebase scan (brownfield, no docs) | languages, frameworks, existing test coverage, rough size of touched areas | `observed` |
| None found (greenfield, no docs, no code) | nothing — every field starts as a hole | — |

Show the pre-filled scope table, with its provenance column, **before**
asking a single question. Then ask only the holes the scan left open — never
re-ask what a document already stated or a scan already observed. A hole the
user declines to answer is filled with the skill's best guess and labeled
`proposed`, never silently upgraded to `stated`.

## 2. Depth question — ask first

Depth sizes every question that follows it, so it is the first thing asked,
before scope confirmation and before any factor scoring.

| Depth | What it drives | Precision |
| --- | --- | --- |
| QUICK | feature-level factor-scored tiering only | ±wide |
| STANDARD | task-level three-point PERT | ± moderate |
| DEEP | STANDARD plus per-scenario detail (multiple team/plan combinations sized individually) | ± narrower |

## 3. Clear-vs-assumed gate

Before any sizing happens, present two lists side by side:

- **confirmed scope** — what the evidence stated or the user confirmed.
- **assumptions I'm making** — every gap filled by a guess, each one paired
  with its impact-if-wrong (what changes, and by how much, if the guess is
  wrong).

The user corrects this pair of lists before sizing starts. Every assumption
here transfers verbatim into the `assumptions` array of
`estimation-inputs.json` and, from there, into the deliverable's Assumptions
table — do not paraphrase it between the gate and the file.

## 4. Question sequence

Ask one thing at a time, in this order:

1. **Scope confirm** — walk the clear-vs-assumed gate; get sign-off or
   corrections.
2. **Factor scores per feature** — five factors, each scored 1-5: tech
   complexity, feature size, dependencies, uncertainty, risk. (STANDARD/DEEP
   also want task-level O/M/P — see `techniques.md`.)
3. **Team options + rates + seniority mix** — how many engineers, what they
   cost per hour, and whether each is junior/mid/senior.
4. **Claude plan availability** — none / Max 5x / Max 20x, per scenario.
5. **Deadline / constraints** — any hard date or budget ceiling.
6. **calibration table** — ask for the org's own tier → hour-band history; if
   none exists, offer the defaults `S 20-60h, M 60-160h, L 160-400h`.
7. **Expose-rates-to-client** — y/n; controls whether the client-facing render
   shows labor rates or only totals.

## 5. Loop rule

If answering a later question (factor scoring, team sizing, whatever)
surfaces a scope hole — a feature nobody named, a dependency nobody
mentioned — stop and go back to the clear-vs-assumed gate. Never absorb new
scope silently mid-sizing; the gate is the only place scope changes.
