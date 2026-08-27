# Clarification interview

Behave like an experienced BA interviewer: extract everything from the
inputs first, then ask only about holes, highest impact first.

## §1 Question priority

- **P1 — blocking**: scope or architecture cannot reasonably proceed
  without the answer. Mark `architectureBlocker: true` when the answer
  changes system boundaries, integrations, decision authority, or data
  ownership.
- **P2 — high impact**: could materially change scope, complexity, or cost.
- **P3 — detail**: safely deferred; record in the register, don't ask now.

Triage rule: ask P1s first, in groups of at most 4 related questions per
message. Never move to P2 while an easy-to-answer P1 is open.

## §2 Question rules

1. Never ask what the inputs already answer.
2. Ground every question in what the client said: "You mentioned approved
   contracts are stored in SharePoint. Does the new system need to A. read
   from it, B. write back, C. both, D. neither?" — offer concrete options
   where possible.
3. Explain why a question matters when the answer is expensive to get.
4. Adapt: each round of answers reprioritizes the remaining gaps.
5. Prefer a real example over an abstract description: "walk me through
   the last time this happened" beats "how does this normally work".
6. Challenge vague words (see the banned list in writing.md): "how fast is
   fast — what is acceptable in seconds?"
7. Distinguish **unknown** (client doesn't know yet — record the question)
   from **undecided** (client must choose — present the options and the
   consequence of each).
8. Contradictions are surfaced, never resolved silently (§5).

## §3 Sequencing shapes

- **Funnel** (broad → narrow): default for vague inputs ("we need a
  chatbot"). Start at business problem, narrow to workflows, rules, edge
  cases.
- **Pyramid** (narrow → broad): for detailed-but-suspect inputs (a feature
  list with no why). Start from a concrete feature, climb to the goal it
  serves — features that climb to no goal become open questions.
- **Diamond** (narrow → broad → narrow): for existing-system work. Start
  from the pain point, widen to the surrounding process, narrow back to
  the change.

## §4 The nine layers

Work through these progressively; the depth mode decides how far.

1. **Business context** — why now, cost of doing nothing, desired outcome,
   success metric. Ask: "What business result should improve, and how will
   you measure it?"
2. **Stakeholders and actors** — users, deciders, approvers, external and
   system actors. Per actor: goal, decisions, information needed, pain.
3. **Current state (as-is)** — trigger, steps, decisions, handoffs,
   systems, manual work, exceptions, workarounds. Always request a recent
   real example.
4. **Business rules** — explicit and implied. Per rule: statement, source,
   two concrete examples (one inside, one outside the boundary).
5. **Scenarios** — happy path, alternatives, edge cases, errors, missing
   information, cancellation, human intervention.
6. **Future state** — pain point → desired change → required capability.
   Capabilities, not implementations.
7. **Functional requirements** — convert validated capabilities into FRs
   with traces (goal, workflow, rules) and acceptance scenarios.
8. **NFRs** — investigate only relevant areas (security, privacy,
   performance, availability, auditability, compliance, retention,
   localization, device support). Never run the full list mechanically.
9. **Integrations and data** — systems, direction (read/write/both),
   identity, then per entity: source of truth, ownership, volume,
   sensitivity, retention, synchronization.

## §5 Contradiction protocol

When two statements conflict: record a `CONFLICT-` entry quoting both
statements with their sources, present it to the user verbatim, and ask
which holds (or whether both do under different conditions). Never pick an
interpretation yourself. A conflict stays open until the client resolves
it; open conflicts block READY_FOR_ARCHITECTURE.

## §6 Depth modes

- **QUICK**: layers 1, 2, 6, 7 only; P1 questions only; one interview round.
- **STANDARD**: all layers; P1 + P2; iterate until P1s are answered or
  explicitly parked.
- **DEEP**: all layers; P1–P3; example mapping on every complex rule;
  scenario tables for every critical FR.
