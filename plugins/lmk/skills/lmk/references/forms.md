# Forms reference

Read only the section for the form you chose.

Contents: [diff](#diff) · [tree](#tree) · [table](#table) ·
[pseudocode](#pseudocode) · [plan steps](#plan-steps) ·
[flowchart](#flowchart) · [sequence](#sequence) · [state](#state) ·
[timeline](#timeline) · [gantt](#gantt) · [kanban](#kanban) ·
[mindmap](#mindmap) · [renderer notes](#renderer-notes)

## diff

Show *what changes* against a shape the reader already knows. Works for
call trees, file layouts, and logic — not just code.

Good (the point is the two added steps):

```diff
 submitForm
   createSession
     persistPrompt
+    expandSkillMention
     launchAgent
+  subscribeToEvents
```

Bad: pasting the full new function when only two lines changed — the reader
has to diff it mentally, which is the job you were supposed to do.

## tree

Hierarchies and file responsibility. Annotate nodes with a short purpose
when names alone don't carry it.

```text
src/
├── commands/     # parses user actions
├── sessions/     # owns session state
└── transport/    # sends API requests
```

Keep it shallow — two or three levels. Depth past what the reader asked
about is noise.

## table

Comparisons and decisions. Two to four columns; explanation lives in a
sentence after the table, not crammed into cells.

```text
| | Redis queue | Postgres LISTEN/NOTIFY |
|---|---|---|
| extra infra | yes | no |
| delivery | at-least-once | best-effort |
| throughput | high | moderate |
```

End a decision table with the one-line "so what": which row should drive
the choice.

## pseudocode

Logic and algorithms, stripped to control flow:

```text
on(save)
  if content unchanged
    return cached result
  write new content
  invalidate cache
```

## plan steps

What you're about to do, each step with its own check:

```text
1. Add failing test for expiry bug   → verify: test fails
2. Fix comparison in checkToken()    → verify: test passes
3. Run full suite                    → verify: all green
```

## flowchart

Flows, pipelines, call chains, dependencies. `graph TD` for branching,
`graph LR` for short linear flows (≤5 nodes).

```text
graph TD
    A[cli.js] --> B{.agents exists?}
    B -->|yes| C[copy skill]
    B -->|no| D[create dir]
    D --> C
```

Verified: node shapes `[]` `{}` `()` `([])`, edge labels `-->|label|`,
`subgraph name ... end`. Keep labels 1–4 words — every character widens
the box.

## sequence

Interactions between components over time:

```text
sequenceDiagram
    participant User
    participant CLI
    participant FS
    User->>CLI: install -p lmk
    CLI->>FS: copy skills
    FS-->>CLI: done
```

Verified: `->>` solid, `-->>` dashed reply. 3–4 participants max — more
gets wider than a terminal.

## state

Lifecycles and status machines:

```text
stateDiagram-v2
    [*] --> Pending
    Pending --> Running: start
    Running --> Done: success
    Running --> Failed: error
    Failed --> Pending: retry
```

Verified: `[*]` initial state, `: label` on transitions.

## timeline

Phases without dates:

```text
timeline
    title Migration
    Phase 1 : Schema copy
    Phase 2 : Backfill
    Phase 3 : Cutover
```

One event per `:` reads best; multiple events on one line render joined.

## gantt

Phases *with* dates or durations:

```text
gantt
    title Plan
    section Phase 1
    Schema copy :a1, 2026-08-01, 3d
    Dual write :after a1, 2d
```

Verified: sections, `after` dependencies, day durations.

## kanban

Work status at a glance:

```text
kanban
  todo[Todo]
    t1[Write spec]
  doing[Doing]
    t2[Vendor termaid]
  done[Done]
    t3[Branch created]
```

## mindmap

Scope breakdowns too deep for a flat tree. Renders compactly:

```text
mindmap
  root((project))
    Forms
      diff
      tree
    Render
      termaid
```

Prefer a plain markdown tree unless breadth is the point.

## renderer notes

- Renderer: vendored termaid wheel, invoked via `scripts/render.sh`,
  stdin → stdout. Needs only `python3`.
- `--width N` fits narrower terminals; long labels wrap inside boxes.
- ER diagrams (`erDiagram`) also render, for schema questions.
- On parse errors the exit code is non-zero: simplify (shorter labels,
  fewer nodes), retry once, then fall back to a small hand-drawn sketch.
