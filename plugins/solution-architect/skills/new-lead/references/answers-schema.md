# `new-lead-answers.json` schema

One file per lead, living beside `ARCHITECTURE.md`, `estimation.json`, and
`proposal.md` in that lead's directory. It is the single interview record
for a lead — evidence gathered, scope agreed, tech and delivery constraints,
proposal terms, and the running trail of decisions the orchestrator and
agents made along the way. `arch-docs`, `estimate`, and `proposal` each read
from it in orchestrated mode instead of running their own interview step.

This is a different thing from `leads.json`: the registry holds business
metadata only (status, value, dates) for the dashboard, and is never read
for generation. This file is generation truth.

```jsonc
{
  "version": 1,
  "lead":     { "id": "acme-crm", "client": "Acme", "title": "CRM rebuild",
                "created": "2026-08-07" },
  "evidence": { "sources": [ { "type": "rfp|codebase|notes|none",
                "path": "rfp.md", "summary": "one-paragraph digest" } ] },
  "client":   { "industry": "", "contact": "", "techLevel": "non-technical|mixed|technical",
                "relationship": "new|returning" },
  "scope":    { "summary": "", "mustHave": [], "niceToHave": [], "outOfScope": [],
                "assumed": [] },              // assumed -> estimate labels these `proposed`
  "tech":     { "stack": [], "integrations": [], "hosting": "", "compliance": [] },
  "delivery": { "deadline": "", "budgetRange": "", "depth": "QUICK|STANDARD|DEEP",
                "technique": "", "teamNotes": "" },
  "proposal": { "validityDays": 30, "firmProfile": "", "storageScope": "",
                "priority": "price|speed|reliability",
                "scenario": null },           // set by the orchestrator at gate 2
  "decisions": []                             // appended by orchestrator + agents
}
```

## Fields

| Group | Fields | Read by |
| --- | --- | --- |
| `lead` | `id` (kebab-case, same format as a `leads.json` entry and the lead's directory name), `client`, `title`, `created` | identity only — no orchestrated-mode section reads this group for generation |
| `evidence` | `sources[]` — each `{ type: rfp\|codebase\|notes\|none, path, summary }` | arch-docs (background for the interview it skips), estimate (evidence findings) |
| `client` | `industry`, `contact`, `techLevel` (`non-technical\|mixed\|technical`), `relationship` (`new\|returning`) | proposal (client context and tech level) |
| `scope` | `summary`, `mustHave[]`, `niceToHave[]`, `outOfScope[]`, `assumed[]` | arch-docs (scope), estimate (`mustHave`/`niceToHave` are stated, `assumed` items are proposed — labeled `proposed`, never silently resolved) |
| `tech` | `stack[]`, `integrations[]`, `hosting`, `compliance[]` | arch-docs (stack/integrations/hosting/compliance) |
| `delivery` | `deadline`, `budgetRange`, `depth` (`QUICK\|STANDARD\|DEEP`), `technique`, `teamNotes` | arch-docs (constraints), estimate (`depth` and `technique` — technique is taken as already confirmed, not re-asked) |
| `proposal` | `validityDays`, `firmProfile`, `storageScope`, `priority` (`price\|speed\|reliability`), `scenario` | proposal (validity, firm profile, storage scope, the client's stated priority — shapes the Executive Summary's emphasis — and the scenario picked at the estimate gate — no `scenario` means proposal stops and reports rather than picking one; no `priority` means the Executive Summary is written without a stated emphasis, the same as when the standalone interview's question goes unanswered — proposal never picks a default emphasis) |
| `decisions` | array, appended only | every skill's orchestrated-mode report includes `decisions[]`; the orchestrator appends at every gate |

## Rules

1. Every field is optional except `version` and `lead.id` — a missing answer
   is an honest absence, and downstream skills must treat it per their own
   hard rules, never invent one.
2. The file is generation truth — `leads.json` mirrors only registry fields
   and is never read for generation.
3. The orchestrator appends to `decisions` at every gate (technique confirm,
   scenario pick, gate verdicts) so the file is a self-contained audit trail.
