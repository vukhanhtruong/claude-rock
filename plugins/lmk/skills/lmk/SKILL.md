---
name: lmk
description: Explain the current topic visually, right in the terminal — cheap diagrams instead of walls of text. Use this whenever the user says "lmk", "explain this", "show me", "visualize", "how does X work", "what's the plan", "I'm confused", asks for a recap of a plan or change, or would clearly understand something faster as a picture than as prose — even if they never say the word "diagram". Covers code, plans, architectures, decisions, and concepts.
---

# lmk — let me know, visually

Explain the current topic with the smallest visual that makes the point
clear, printed directly in the terminal. No preamble, no HTML, at most ~3
sentences of prose around the visual. The reader just asked to *see* the
thing — every extra paragraph defeats the purpose.

## 1. Resolve the topic

- An argument or explicit subject was given → that is the topic.
- Bare invocation mid-conversation → the last substantial thing discussed:
  a plan just proposed, a change just made, a concept being untangled.
  This is the most common case — someone read a wall of text and wants to
  see it.
- Bare invocation with nothing to point at → ask in one line what to explain.

## 2. Gate: do you actually know the facts?

- The facts are already in the conversation (you just planned it, wrote it,
  or discussed it) → draw now. Zero extra reads.
- Cold topic ("explain the auth flow" with nothing in context) → gather the
  minimum facts first. A direction the user named wins; otherwise start from
  entry points and recent-change hot spots (`git log --oneline`). Collect
  only what the visual needs: node names, edges, order. This is not an
  audit.
- Never draw a box you haven't verified exists. A confident diagram of
  made-up components is worse than no diagram, because the reader trusts it.

## 3. Route by topic shape

Pick the row that matches the *shape* of the topic, not its domain — code,
plans, and concepts all use the same table.

| Topic shape | Form | How |
|---|---|---|
| change, refactor, before/after | diff block | markdown |
| hierarchy, file layout | tree | markdown |
| comparison, decision, options | table | markdown |
| logic, algorithm | pseudocode | markdown |
| plan steps ("what I'll do") | numbered steps + verify per step | markdown |
| scope breakdown (epic → tasks) | tree; mindmap only if deep | markdown / render.sh |
| flow, pipeline, call chain | flowchart | render.sh |
| interaction between parts | sequence diagram | render.sh |
| states, lifecycle | state diagram | render.sh |
| dependencies, ordering | flowchart | render.sh |
| phases, timeline, milestones | timeline (or gantt if dated) | render.sh |
| work status | kanban | render.sh |

Choose the smallest form that lands the point. One form is the norm, two is
the ceiling (e.g. a flowchart plus a tradeoff table). More than that
overwhelms instead of explaining.

Before writing any form, read its section in `references/forms.md` — it has
a good/bad example per form and the Mermaid syntax verified to work with the
renderer.

## 4. Render

Markdown forms: write them inline, fenced.

Mermaid forms: write compact Mermaid source (keep labels short — the
renderer draws the boxes, you only name them), then pipe it through the
bundled renderer and paste the output as a fenced block:

```bash
echo '<mermaid source>' | <skill-path>/scripts/render.sh
```

`render.sh` needs only `python3`; the renderer itself ships inside this
skill. Pass `--width N` if the diagram should fit a narrower terminal.

If render.sh exits non-zero (no python3, unsupported syntax), simplify the
source and retry once; if it still fails, hand-draw a *small* ASCII sketch
instead — never a sprawling one.

## 5. Out of scope

If the user explicitly asks for an HTML file, a browser page, or a slide
deck, this skill does not apply — that request wants a different (more
expensive) medium. Say so in one line and proceed without this skill.
