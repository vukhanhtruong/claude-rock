# new-lead

Sets up a pre-sales lead workspace and walks you through the three
solution-architect skills in order, stopping between each so you see what was
produced before the next one starts.

```
/new-lead @leads/acme-corp-payments-rework/
   → /analyze-requirements   ARCHITECTURE.md
   → /estimate               estimation.json
   → /proposal               proposal.md
   → dashboard URL
```

Each skill runs exactly as it does standalone: its own interview, its own
validation, its own rendered page. `/new-lead` never interviews and never
writes a document.

## Workspace layout

```
<leads-root>/
├── leads.json            registry (status, value, dates)
├── start.sh              starts the dashboard
├── leads/
│   └── <lead-id>/        one directory per lead
│       ├── <your documents — the RFP, notes, anything you were sent>
│       ├── ARCHITECTURE.md, estimation.json, proposal.md
│       └── dist/         the rendered pages
└── scripts/              serve.mjs, dashboard pages, lib/, vendor/
```

## Starting a lead

Make a directory under `leads/` and run `/new-lead`. A folder with no registry
entry is a new lead; `/new-lead` with no argument lists what is new, in
progress, and finished.

Name the folder in kebab-case — it becomes the lead id verbatim.

## Dashboard quickstart

```
cd <leads-root>
./start.sh
```

Serves on `127.0.0.1:4600` (override with `--port <n>`) with no agent running.
