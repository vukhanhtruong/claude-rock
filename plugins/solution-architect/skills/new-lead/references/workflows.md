# Workflows — the three scripts the orchestrator launches

Read while running SKILL.md's workflow steps. This defines the three
Workflow scripts the orchestrator launches verbatim (with `args` filled in)
— one per document, run between the human gates. Each script's phases are
its own internal fan-out and review; the orchestrator never talks to the
user from inside a workflow, and no workflow talks back to the user either
— that happens only in the main loop, before or between workflows.

Every script takes `args = { leadDir, answersPath, skillsDir }` (plus the
per-script extras noted in its own comment) and returns the fixer's report
object: `{ report, findings, fixed }`, where `report` is the writer's
`REPORT`-shaped output, `findings` is the flattened list every reviewer
returned, and `fixed` is the fixer's `FIXED`-shaped output (or, when no
reviewer found anything, a pass-through with an empty `applied`/`rejected`
and the writer's own `validateExit`).

## Shared schemas

Every `agent()` call below that expects structured output is forced to one
of these three shapes.

```js
const REPORT = { type: 'object', required: ['files', 'validateExit', 'decisions'],
  properties: { files: { type: 'array', items: { type: 'string' } },
    validateExit: { type: 'number' },
    decisions: { type: 'array', items: { type: 'string' } } } };
const FINDINGS = { type: 'object', required: ['findings'],
  properties: { findings: { type: 'array', items: { type: 'object',
    required: ['claim', 'where', 'severity'],
    properties: { claim: { type: 'string' }, where: { type: 'string' },
      severity: { enum: ['high', 'medium', 'low'] } } } } } };
const FIXED = { type: 'object', required: ['applied', 'rejected', 'validateExit'],
  properties: { applied: { type: 'array', items: { type: 'string' } },
    rejected: { type: 'array', items: { type: 'object',
      required: ['claim', 'reason'], properties: { claim: { type: 'string' },
        reason: { type: 'string' } } } },
    validateExit: { type: 'number' } } };
```

## Workflow 1 — ARCH

Four phases: Research fans out to parallel research agents seeded from the
lead's `tech` and `evidence` answers, Write runs arch-docs headless with
those findings folded in, Review runs three lens reviewers in parallel, Fix
verifies and applies. The barrier between Research and Write is real — the
writer's prompt embeds `JSON.stringify(research)`, so `parallel()` must
settle every research agent (a dead one becomes `undefined`, dropped by the
`.filter(Boolean)`) before the writer's prompt can be built at all.

```js
export const meta = {
  name: 'new-lead-arch',
  description: 'Architecture docs for a lead via headless arch-docs',
  phases: [{ title: 'Research' }, { title: 'Write' }, { title: 'Review' }, { title: 'Fix' }],
}
// args: { leadDir, answersPath, skillsDir, topics: [{key, prompt}] }
// topics are prepared by the orchestrator from answers.tech + evidence,
// per arch-docs references/research.md — typically 3-4 of: stack, integrations,
// hosting, compliance.
phase('Research')
const research = (await parallel(args.topics.map(t => () =>
  agent(`${t.prompt}\nLead answers: ${args.answersPath}. Follow ` +
    `${args.skillsDir}/arch-docs/references/research.md. Return your findings ` +
    `as compact JSON text: [{fact, source, confidence}].`,
    { label: `research:${t.key}`, phase: 'Research' }))))
  .filter(Boolean);

phase('Write')
const report = await agent(
  `Run the arch-docs skill in Orchestrated mode (read ` +
  `${args.skillsDir}/arch-docs/SKILL.md — the Orchestrated mode section governs). ` +
  `Answers file: ${args.answersPath}. Write the model and ARCHITECTURE.md into ` +
  `${args.leadDir}. Research findings to incorporate (tag researched facts with ` +
  `their source): ${JSON.stringify(research)}. Run the skill's validate.mjs ` +
  `until exit 0.`, { schema: REPORT, phase: 'Write' });

phase('Review')
const LENSES = ['provenance-integrity', 'internal-consistency', 'completeness-vs-interview'];
const reviews = (await parallel(LENSES.map(lens => () =>
  agent(`Review ${args.leadDir}/ARCHITECTURE.md through the "${lens}" lens defined in ` +
    `${args.skillsDir}/new-lead/references/review-lenses.md. Interview answers: ` +
    `${args.answersPath}. Report findings only — no fixes.`,
    { label: `review:${lens}`, phase: 'Review', schema: FINDINGS }))))
  .filter(Boolean).flatMap(r => r.findings);

phase('Fix')
const fixed = reviews.length === 0
  ? { applied: [], rejected: [], validateExit: report.validateExit }
  : await agent(`Apply the verify-then-fix protocol from ` +
      `${args.skillsDir}/new-lead/references/review-lenses.md to ` +
      `${args.leadDir}/ARCHITECTURE.md. Findings: ${JSON.stringify(reviews)}. ` +
      `Sources of truth: the answers file ${args.answersPath}, the model, and ` +
      `provenance tags. Re-run arch-docs validate.mjs until exit 0 after fixing.`,
      { schema: FIXED, phase: 'Fix' });
return { report, findings: reviews, fixed };
```

This is the workflow gate 1 reviews: the human checks `ARCHITECTURE.md`
plus this script's `applied`/`rejected` report before the orchestrator
renders the arch viewer into `dist/` and commits.

## Workflow 2 — ESTIMATE

Three phases: Size runs estimate headless (Companion mode applies —
`ARCHITECTURE.md` already exists in `leadDir` by this point, since this
workflow only runs after gate 1 passes), Review runs two lens reviewers in
parallel, Fix verifies and applies.

```js
export const meta = {
  name: 'new-lead-estimate',
  description: 'Estimate for a lead via headless estimate skill',
  phases: [{ title: 'Size' }, { title: 'Review' }, { title: 'Fix' }],
}
// args: { leadDir, answersPath, skillsDir }
phase('Size')
const report = await agent(
  `Run the estimate skill in Orchestrated mode (read ` +
  `${args.skillsDir}/estimate/SKILL.md — Orchestrated mode section governs; ` +
  `companion mode applies: ARCHITECTURE.md is in ${args.leadDir}). Answers file: ` +
  `${args.answersPath}. Write estimation-inputs.json, run compute.mjs, write ` +
  `estimation.md into ${args.leadDir}, run validate.mjs until exit 0.`,
  { schema: REPORT, phase: 'Size' });

phase('Review')
const LENSES = ['numbers-trace', 'assumptions-honesty'];
const reviews = (await parallel(LENSES.map(lens => () =>
  agent(`Review ${args.leadDir}/estimation.md and estimation.json through the ` +
    `"${lens}" lens from ${args.skillsDir}/new-lead/references/review-lenses.md. ` +
    `Answers: ${args.answersPath}. Findings only.`,
    { label: `review:${lens}`, phase: 'Review', schema: FINDINGS }))))
  .filter(Boolean).flatMap(r => r.findings);

phase('Fix')
const fixed = reviews.length === 0
  ? { applied: [], rejected: [], validateExit: report.validateExit }
  : await agent(`Verify-then-fix (protocol in ` +
      `${args.skillsDir}/new-lead/references/review-lenses.md) on the estimate ` +
      `files in ${args.leadDir}. Findings: ${JSON.stringify(reviews)}. Numbers may ` +
      `only change by editing estimation-inputs.json and re-running compute.mjs — ` +
      `never by hand. Re-run validate.mjs until exit 0.`,
      { schema: FIXED, phase: 'Fix' });
return { report, findings: reviews, fixed };
```

Gate 2 reviews this workflow's output: the human checks `estimation.md` and
picks the scenario here (written to `proposal.scenario` in the answers
file) before the orchestrator renders `estimate.html`, commits, and sets
the registry value.

## Workflow 3 — PROPOSAL

Three phases: Assemble runs proposal headless (the scenario is already in
`answers.proposal.scenario` — set by the orchestrator at gate 2, so this
workflow never has to ask), Review runs the proposal skill's own fresh-eyes
review alongside a client-readability lens reviewer in parallel, Fix
verifies and applies with a one-re-review-cycle cap.

```js
export const meta = {
  name: 'new-lead-proposal',
  description: 'Client proposal for a lead via headless proposal skill',
  phases: [{ title: 'Assemble' }, { title: 'Review' }, { title: 'Fix' }],
}
// args: { leadDir, answersPath, skillsDir }   (scenario already in answers.proposal.scenario)
phase('Assemble')
const report = await agent(
  `Run the proposal skill in Orchestrated mode (read ` +
  `${args.skillsDir}/proposal/SKILL.md — Orchestrated mode section governs; stop ` +
  `after writing + validating, per that section). Answers file: ${args.answersPath}. ` +
  `Lead dir: ${args.leadDir}. Run derive.mjs for figures; validate.mjs until exit 0.`,
  { schema: REPORT, phase: 'Assemble' });

phase('Review')
const reviews = (await parallel([
  () => agent(`Run the proposal fresh-eyes review per ` +
    `${args.skillsDir}/proposal/references/review.md on ${args.leadDir}/proposal.md. ` +
    `Report findings only, as JSON findings.`,
    { label: 'review:fresh-eyes', phase: 'Review', schema: FINDINGS }),
  () => agent(`Review ${args.leadDir}/proposal.md through the "client-readability" ` +
    `lens from ${args.skillsDir}/new-lead/references/review-lenses.md. Client tech ` +
    `level is in ${args.answersPath}. Findings only.`,
    { label: 'review:readability', phase: 'Review', schema: FINDINGS }),
])).filter(Boolean).flatMap(r => r.findings);

phase('Fix')
const fixed = reviews.length === 0
  ? { applied: [], rejected: [], validateExit: report.validateExit }
  : await agent(`Verify-then-fix (protocol in ` +
      `${args.skillsDir}/new-lead/references/review-lenses.md) on ` +
      `${args.leadDir}/proposal.md. Findings: ${JSON.stringify(reviews)}. Every ` +
      `number must trace to proposal-figures.json (derive.mjs output). One ` +
      `re-review cycle max. Re-run proposal validate.mjs until exit 0.`,
      { schema: FIXED, phase: 'Fix' });
return { report, findings: reviews, fixed };
```

Gate 3 reviews this workflow's output: the human reviews `proposal.md` —
this is proposal's own hard rule 5 (human review), satisfied by this gate
rather than skipped — before the orchestrator renders `proposal.html` and
commits.

## Launching and resuming

Launch each script via the Workflow tool with the script inline and `args`
as a JSON object. On failure, resume with `Workflow({scriptPath,
resumeFromRunId})` — the tool result carries both values. A `null` `report`
(the writer or fixer agent died) is a failed phase — surface it in the gate
report, never fabricate a result for it.
