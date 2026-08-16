# lmk

"Let me know" — explains the current topic visually, right in the terminal.

Ask `/lmk` (or just say "explain this", "show me") and the skill picks the
smallest visual that makes the point: a diff, tree, table, or pseudocode
drawn inline, or a flowchart / sequence / state / timeline / gantt / kanban
diagram rendered as unicode box art by a bundled Mermaid renderer
([termaid](https://github.com/fasouto/termaid), MIT, vendored as a wheel in
`scripts/vendor/`). No browser, no HTML — an explanation costs ~100–300
output tokens instead of the thousands a generated HTML page would.

Bare `/lmk` explains the last substantial thing in the conversation — the
plan just proposed, the change just made.

## Requirements

`python3` on PATH. Nothing else — the renderer ships inside the skill.

## Layout

```
lmk/
├── SKILL.md            routing table, explore gate, output rules
├── references/forms.md per-form examples + verified Mermaid syntax
├── evals/evals.json    eval prompts + assertions
└── scripts/
    ├── render.sh       stdin Mermaid → terminal diagram
    └── vendor/         termaid wheel + MIT license
```
