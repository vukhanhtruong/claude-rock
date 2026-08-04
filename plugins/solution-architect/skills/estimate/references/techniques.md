# Techniques — which method fits which evidence, and how to run each

Read when choosing a sizing technique and again while eliciting numbers for
it. Defines the decision table that picks a technique from evidence quality,
then the mechanics of each named technique.

## 1. Decision table

| Evidence quality | Recommended technique | Precision |
| --- | --- | --- |
| Vague RFP, no history | factor-scored tiering (5 factors) at feature level | ±100%, bands |
| Detailed backlog or ARCHITECTURE.md | task-level three-point PERT | ±50% |
| Backlog + codebase + calibration data | PERT + analogy cross-check; flag divergence >30% | ±25% |
| Change request on a known repo | analogy to similar past change + code-scan sizing | ±25% |

The skill states its recommended technique and the reason it picked that row
(evidence quality observed during the interview), then lets the user confirm
or override before any numbers are elicited.

## 2. Factor-scored tiering

Used for row 1 — a vague RFP with no delivery history, no task breakdown
yet. This is also the technique QUICK depth commits to. Score each feature
1-5 on five factors:

- tech complexity
- feature size
- dependencies
- uncertainty
- risk

Sum the five scores per feature. Tier breaks: ≤10 S / 11-17 M / ≥18 L.

A tier is not itself an hour figure. It is looked up against the
**calibration table** — the org's own historical tier → hour-band data if
supplied during the interview, or the defaults `S 20-60h, M 60-160h, L
160-400h` if not. The calibration table is what turns "this is an M" into a
number; never assign hours from the tier letter directly.

## 3. Three-point PERT

Used for row 2 — a detailed backlog or an existing `ARCHITECTURE.md` gives
enough to break work into tasks (STANDARD/DEEP depth). Alone, this is
±50% precision; combined with the analogy cross-check below (row 3, once
codebase evidence and a calibration table also exist), precision tightens
to ±25%. Elicit three numbers per task — optimistic (O), most-likely (M),
pessimistic (P) — and feed them to `pert()` in `estimate-math.mjs`, which
computes `(O + 4M + P) / 6`.

Elicitation guidance, asked in this order:

- **O (optimistic):** "if everything goes right — no surprises, no
  rework — how many hours?"
- **M (most likely):** "realistically, accounting for the normal amount of
  friction, how many hours?"
- **P (pessimistic):** "if the risks you can actually name land — not the
  worst thing you can imagine, but a specific named risk (a dependency
  slips, a library doesn't do what the docs say) — how many hours?"

P must anchor to a named risk, never to "worst imaginable." An unanchored P
inflates the buffer for no reason and erodes trust in the range.

## 4. Analogy cross-check

Two applications, both anchored to a comparable past delivered item:

- **Row 3 — cross-check on top of PERT.** Once backlog, codebase, and a
  calibration table are all available, compare the PERT total for the
  current scope against the actual hours the past item took (or its own
  PERT total, if it was never closed out). If the two diverge by more than
  30%, flag it and reconcile — either the current breakdown is missing
  tasks the analogy remembers, or the analogy isn't as comparable as it
  looked — before writing anything to `estimation-inputs.json`. Do not
  average the two numbers away; the divergence itself is the useful signal.
- **Row 4 — standalone technique for a change request on a known repo.**
  No fresh PERT elicitation: size the change by comparing it directly to a
  similar past change on the same repo, then confirm that comparison with a
  codebase scan (how many call sites, how many tests, how much of the
  touched code is boilerplate vs logic vs novel). The same >30% divergence
  flag-and-reconcile rule applies between the analogy's hours and the
  code-scan's implied hours before the number ships.
