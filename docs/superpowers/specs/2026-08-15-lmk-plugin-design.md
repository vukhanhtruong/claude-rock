# lmk — terminal-native visual explainer

Date: 2026-08-15
Status: approved

## Problem

Understanding an agent's plans, changes, and explanations often means reading
walls of text. The existing `visual-explainer` plugin solves this with rich
HTML pages, but each page costs 5,000–15,000 output tokens and requires a
browser. Most explanation moments need something far cheaper: a small picture
right in the terminal.

## Goal

A standalone plugin `lmk` ("let me know") with one skill that explains the
current conversation topic — code, plans, or concepts — visually, in the
terminal, at ~100–300 output tokens per explanation.

## Approach

Route by topic *shape*, not domain. Simple shapes are drawn as plain markdown
by the model. Boxes-and-arrows diagrams are written as compact Mermaid source
and rendered deterministically by a vendored copy of
[termaid](https://github.com/fasouto/termaid) (MIT, pure Python, zero
dependencies, 156 KB wheel). The model never hand-draws large box art and
never writes HTML.

```
"explain X" ──▶ topic resolution ──▶ explore gate ──▶ routing table ──▶ output
```

### Topic resolution

| Invocation | Behavior |
|---|---|
| argument given | that is the topic |
| bare, mid-conversation | last substantial thing: plan just proposed, change just made, concept under discussion |
| bare, empty conversation | one-line ask: "what should I explain?" |

### Explore gate

- Facts already in conversation (just planned / wrote / discussed it) → draw
  immediately, zero extra cost.
- Cold topic → light explore first: a user-named direction wins; otherwise
  git-log hot spots and entry points. Gather only the nodes, edges, and order
  the visual needs — not a full audit.
- Rule: never draw a box that has not been verified to exist. A hallucinated
  diagram is worse than no diagram.

### Routing table

Keyed by topic shape; code, planning, and concept topics all use the same
table.

| Topic shape | Form | Renderer |
|---|---|---|
| change / refactor / before-after | diff block | markdown |
| hierarchy / file layout | tree | markdown |
| comparison / decision / options | table | markdown |
| logic / algorithm | pseudocode | markdown |
| plan steps ("what I'll do") | numbered steps + verify per step | markdown |
| scope breakdown (epic → tasks) | tree; mindmap if deep | markdown / termaid |
| flow / pipeline / call chain | flowchart | mermaid → termaid |
| interaction between parts | sequence diagram | mermaid → termaid |
| states / lifecycle | state diagram | mermaid → termaid |
| dependencies / ordering | flowchart | mermaid → termaid |
| phases / timeline / milestones | timeline or gantt | mermaid → termaid |
| work status | kanban | mermaid → termaid |

Form choice is flexible: pick the smallest form that lands the point.
Usually one form, at most two. Never all.

### Rendering

`scripts/render.sh` pipes Mermaid source on stdin through the vendored wheel:

```bash
PYTHONPATH="$(dirname "$0")/vendor/termaid-0.8.0-py3-none-any.whl" \
  python3 -m termaid --ascii
```

Wheels are zip-importable, so no install step exists. Only hard requirement:
`python3`. Only Mermaid syntax verified against termaid's parser (smoke-tested
per diagram type) is documented in `references/forms.md`.

### Fallback and routing out

- `render.sh` fails (no python3, unsupported syntax) → hand-drawn ASCII, kept
  small.
- User explicitly asks for an HTML file or browser page → out of scope for
  lmk; defer to `visual-explainer` (if installed) or plain generation.

### Output discipline

Visual plus at most ~3 sentences of context. No preamble. No HTML, ever.

## Layout

```
plugins/lmk/
├── .claude-plugin/plugin.json          # name lmk, version 0.1.0
└── skills/lmk/
    ├── SKILL.md                        # routing, gate, rules (~100 lines)
    ├── references/forms.md             # per-form examples + termaid quirks
    ├── evals/evals.json                # eval prompts + assertions
    └── scripts/
        ├── render.sh
        └── vendor/
            ├── termaid-0.8.0-py3-none-any.whl
            └── LICENSE.termaid         # MIT attribution
```

Marketplace: new entry in `.claude-plugin/marketplace.json` and a row in the
README plugin table. Marketplace install invokes as `/lmk:lmk`
(autocompletes from `/lmk`); the npx installer path yields bare `/lmk`.

## Testing

skill-creator eval loop: three realistic prompts (cold code topic requiring
explore, plan explanation, decision comparison that must route to a table,
not a diagram), each run with-skill and baseline, graded on assertions:
visual block present, no `.html` file created, correct form family, prose
within limit, diagram nodes match real files.

## Future work (v0.2)

HTML upgrade path reusing the same cheap intermediate: the model's Mermaid
source + a small meta JSON injected into a pre-built `assets/template.html`
(vendored mermaid.js). Same ~300-token cost as the terminal path; the model
still never writes HTML. Deferred to keep v0.1 small.

## Rejected alternatives

- Pure prompt skill (show-me style): model hand-draws diagrams —
  inconsistent and token-expensive for big graphs.
- `uvx termaid` on demand: needs uv plus network at first use; vendoring
  removes both.
- mermaid-ascii (Go): flowcharts only, needs a compiled binary.
- HTML escape hatch in v0.1: contradicts the cheap-terminal goal.
