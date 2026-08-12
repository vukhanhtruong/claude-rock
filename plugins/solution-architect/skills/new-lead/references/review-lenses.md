# Review lenses — reviewer prompts + verify-then-fix protocol

Read by the workflow scripts in `references/workflows.md`, which dispatch
one review agent per lens named below (in parallel, per document) and then
one fixer agent that runs the verify-then-fix protocol. Every reviewer
returns findings only, shaped to the `FINDINGS` schema in `workflows.md`:
`{ findings: [{ claim, where, severity: 'high'|'medium'|'low' }] }`. No
reviewer edits anything.

Lenses judge what the target skill's own `validate.mjs` cannot: syntactic
checks (enum membership, presence of a column, a number recomputed from
JSON) are already automated inside each skill. A lens earns its place only
by reading meaning — cross-referencing prose against a source, judging
whether a label is honest, deciding whether a sentence would land with a
given reader — the things no regex or JSON diff can do.

## Lens definitions

### `provenance-integrity`

Hunt every fact in `ARCHITECTURE.md` — table `src` cells and inline prose
tags alike — for a provenance value of `observed`, `stated`, `researched`,
or `proposed`; every `observed`/`researched` claim must show a real source;
flag as a **high** finding any `proposed` fact whose prose reads as settled
rather than as a proposal (no hedge, stated like a done deal). Ignore style
and wording that isn't a provenance problem. analyze-requirements's `validate.mjs`
(`validate-provenance.mjs`) already enforces that every table's `src`
column holds one of the four allowed values — this lens is for what that
enum check cannot see: whether a `researched` claim's cited source actually
supports it, and whether a `proposed` fact's *sentence* carries the
confidence of a fact nobody proposed. Return findings only, one per
confirmed problem: `{claim, where, severity}` — no rewrites.

### `internal-consistency`

Hunt for the same fact given two homes — a value in a table that a prose
paragraph restates differently, a diagram edge the prose contradicts, an id
mentioned in prose or in a table outside §6/§9/§8 that the model doesn't
define. Ignore whether a fact is correct in isolation (`provenance-integrity`'s
job) — this lens compares artifacts against each other, not against
sources. `validate-model-tables.mjs` already name-diffs the Core Components,
External Integrations, and Data Stores tables against the model — but only
those three tables, and only by exact name match; it cannot read a prose
sentence and notice it restates a table's fact with a drifted value, which
is exactly what analyze-requirements's "one home per fact" rule (diagrams own
topology, tables own properties, prose owns neither) exists to prevent.
Return findings only: `{claim, where, severity}`.

### `completeness-vs-interview`

Hunt: every `scope.mustHave` item from the answers file (`new-lead-answers.json`)
appears somewhere in the document; every stated constraint in `tech`
(stack/integrations/hosting/compliance) or `delivery` (deadline) is either
reflected or explicitly deferred; anything the answers file left unanswered
renders as an honest absence, not a filled-in guess. Ignore anything the
answers file itself doesn't mention — there's nothing to check it against.
This is the only lens that reads the answers file against the finished
document; analyze-requirements's `validate.mjs` never opens an answers file at all, so
it has no way to know the interview asked for something the document
silently dropped. Return findings only: `{claim, where, severity}`.

### `numbers-trace`

Hunt every number written in `estimation.md` for a matching value in
`estimation.json` (the `compute.mjs` output — hard rule 3, agent judges,
script computes); any literal `0` anywhere in the document standing in for
the honest absence `not estimated`; any row missing confidence or
assumptions in substance, not just in the empty-cell sense the script
checks. Ignore whether the judgment behind a number is sound — that's
`assumptions-honesty`'s job. estimate's `validate.mjs` recomputes
`estimation.json`'s own `computed` block and diffs it against the stored
one (catches hand-edited JSON) and bans a literal `0` inside the one task
table it locates by header — it never reads `estimation.md`'s prose or its
other tables for a number that quietly drifted from what `compute.mjs`
produced, or for a stray `0` sitting outside that one table. Return
findings only: `{claim, where, severity}`.

### `assumptions-honesty`

Hunt scope items labeled `stated` that `new-lead-answers.json` doesn't
actually state (only `scope.mustHave`/`niceToHave` are `stated` truth —
`scope.assumed` items must be `proposed`, never `stated`); any task category
in `references/ai-multipliers.md` applied uniformly across most or all
tasks regardless of what each task actually is (a de facto blanket
multiplier wearing a per-task label); milestones whose slicing looks
computed rather than judged against `references/slicing.md`'s rules (walking
skeleton first, user-visible value per milestone, dependency order).
Ignore number arithmetic — that's `numbers-trace`. estimate's `validate.mjs`
checks that a scope row's `src` cell is one of `stated`/`proposed` and that
a task row's `assumptions` cell is non-empty; it cannot check whether a
`stated` label is true against the source answers file, whether a spread of
per-task categories is really per-task judgment or a blanket ratio in
disguise, or whether a milestone is a genuine vertical slice — `slicing.md`
says outright that "nothing in `compute.mjs` can tell a good slice from a
bad one." Return findings only: `{claim, where, severity}`.

### `client-readability`

Hunt jargon inappropriate for the client's tech level (`client.techLevel` in
the answers file); internal scenario names, ids, or comparisons between
scenarios leaking into the client-facing text; sections that assume
background the client doesn't have (an analogy that only lands for a
technical reader, a diagram that shows containers to a non-tech client).
Ignore comprehension issues that are really about a `low-tech` or
`technical` client (this lens still reads for background gaps at any level,
but the jargon deny-list check below is specific to `non-tech`). proposal's
`validate.mjs` (`checks-client.mjs`) runs its jargon scan **only** when
`client_tech_level` is `non-tech`, against a small, deliberately fixed
deny-list (`jargon.mjs`'s own comment: "catches the habitual offenders; the
fresh-eyes review catches the rest") — a `low-tech` document gets no
automated jargon check at all, and even a `non-tech` document is only
checked against 19 fixed terms. This lens is the read that covers what the
list and the tech-level gate don't. Return findings only: `{claim, where,
severity}`.

## Verify-then-fix protocol

The fixer's contract, applied by the Fix phase in each workflow after
Review returns findings:

1. For each finding, locate the claim in the target document.
2. Check it against sources, in this priority order: the script's own
   output (`estimation.json` / `proposal-figures.json`) → the answers file
   (`new-lead-answers.json`) → the document's own provenance tags.
3. Assign a verdict: **true**, **partly true**, or **wrong**.
4. Act on the verdict: fix the true part only; for partly true, fix the
   true part and log the rejected part with the evidence that rejected it;
   for wrong, reject with the evidence, make no edit.
5. Numbers change only by editing the skill's own input file and
   re-running its compute script (`estimation-inputs.json` → `compute.mjs`
   for estimate), or, for proposal — which never re-analyzes — by
   correcting the document to match the already-derived
   `proposal-figures.json` (`derive.mjs`'s output). Never hand-edit a
   number directly in the document.
6. Re-run the document's `validate.mjs` until it exits 0.
7. Return `{ applied, rejected, validateExit }` — `applied` and `rejected`
   as described in `workflows.md`'s `FIXED` schema.

Reviewer opinion never outranks a source file: a finding that the sources
don't support is rejected with evidence, not applied because a reviewer
insisted.

## Brief-writer prompt

Used by `SKILL.md` at each gate. Write or update `brief.md` in the lead
directory:

> Write/update `brief.md` in the lead dir: an executive summary (4–5
> sentences: who the client is, what we'd build, why, where the deal
> stands) followed by a `## Decisions` section listing entries from the
> answers file's `decisions` plus the gate's applied/rejected counts.
> Sources: answers file, ARCHITECTURE.md intro, estimation.json totals,
> proposal.md summary — whichever exist. Never invent facts.
