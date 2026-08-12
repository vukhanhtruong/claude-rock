# new-lead

Orchestrates a pre-sales lead end-to-end: one combined interview, then
`ARCHITECTURE.md`, `estimation.md`, and `proposal.md` produced by the
`analyze-requirements`, `estimate`, and `proposal` skills run headless as parallel-agent
workflows, with a human gate before each document ships — plus a local
leads dashboard for tracking every lead in the pipeline.

## The three gates

```
interview → Workflow ARCH     → Gate 1 (approve ARCHITECTURE.md)
          → Workflow ESTIMATE → Gate 2 (approve estimation.md, pick scenario)
          → Workflow PROPOSAL → Gate 3 (approve proposal.md)
          → dashboard URL
```

Each workflow is unattended — research fan-out, a headless writer, a
parallel review panel, and a verify-then-fix pass, all inside that one
workflow. No workflow talks to you; every approval, correction, and the
scenario pick happen at a gate in the main flow.

## Workspace layout

```
<leads-root>/
├── leads.json            registry (business metadata: status, value, dates)
├── serve.mjs, start.sh   dashboard server + launcher (copied from this skill)
├── index.html            dashboard (cards / timeline / wall views)
└── <lead-id>/            one directory per lead
    ├── new-lead-answers.json   generation truth — the interview record
    ├── brief.md                executive summary + decision log
    ├── ARCHITECTURE.md, estimation.md, proposal.md, …
    └── dist/                   rendered pages, filled in gate by gate
```

`leads.json` is never read for generation — only `new-lead-answers.json` is.
Registry writes go through `scripts/lead-upsert.mjs` exclusively.

## Standalone skills, unchanged

`analyze-requirements`, `estimate`, and `proposal` each carry an "Orchestrated mode"
section that only activates when handed a path to a `new-lead-answers.json`
file. Invoked directly, without that file, each behaves exactly as it did
before this skill existed — same interview, same rendering, same output.

## Dashboard quickstart

```
cd <leads-root>
./start.sh
```

Starts `serve.mjs` on `127.0.0.1:4600` (override with `--port <n>`) with no
agent running — the root is self-contained.
