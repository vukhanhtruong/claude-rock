# Milestone 04 — Lead Detail (mockup gate → React Flow canvas)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Read `00-overview.md` Global Constraints first.

**Goal:** The per-lead detail page: executive summary + panels + read-only React Flow lineage canvas, behind a **hard user-approval mockup gate**.

Base dir: `plugins/solution-architect/skills/new-lead/`. Depends on milestones 02 (`/api/leads/:id/map`) and 03 (dashboard links here).

---

### Task 1: Card-detail mockup — HARD GATE

**Files:**
- Create: `assets/dashboard/detail-mockup.html` (throwaway — deleted in Task 3)

**Interfaces:**
- Produces: user-approved panel set + layout for Task 3. Nothing else in this milestone may start before approval.

- [ ] **Step 1: Build a static mockup** with hardcoded fixture data (acme-crm), through the `design-taste-frontend` skill. It must show every panel from the spec so the user can cut:
  - top: executive summary block + next-action banner ("proposal validity expires in 11d")
  - key-facts strip (client, industry, deadline, budget, tech chips)
  - center: lineage canvas **as a static SVG sketch** (boxes + arrows drawn by hand — evidence → interview → arch(+2 components) → estimate(+2 scenarios, one highlighted "picked") → proposal greyed pending; one node expanded showing inline detail)
  - right rail: top-3 risks, open questions, decision log
  - bottom: activity feed + notes textarea; Won/Lost buttons in the header
  - both themes; annotate each panel with a small label of its data source (answers.json / estimation.json / brief.md / git log)

- [ ] **Step 2: Show the user.** Serve it (`node scripts/serve.mjs` against the fixture copy, open `/detail-mockup.html`) or render a screenshot. Ask explicitly: *"Which panels stay, which go, layout OK?"*

- [ ] **Step 3: STOP — wait for explicit approval.** Do not proceed to Task 2 until the user approves. Record approved panel set + any cuts as a comment block at the top of the mockup file (Task 3 carries it into detail.html).

---

### Task 2: Vendored React Flow bundle

**Files:**
- Create: `assets/vendor-build/package.json`, `assets/vendor-build/entry.jsx`, `assets/vendor-build/.gitignore` (`node_modules/`), `assets/dashboard/vendor/reactflow-bundle.js` (committed build artifact)
- Test: `scripts/test/vendor-bundle.test.mjs` (smoke: bundle exists, exposes global, carries stamp)

**Interfaces:**
- Produces: global `LeadFlow.render(container, mapJson, { onNodeClick })` — renders a read-only React Flow canvas (pan/zoom/minimap on; `nodesDraggable`, `nodesConnectable`, `elementsSelectable` false except click). `onNodeClick(node)` receives the clicked map node.

- [ ] **Step 1: Write the smoke test**

```js
// scripts/test/vendor-bundle.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('bundle exists, stamped, exposes LeadFlow', async () => {
  const src = await readFile(new URL('../../assets/dashboard/vendor/reactflow-bundle.js', import.meta.url), 'utf8');
  assert.match(src.slice(0, 200), /new-lead-dashboard v\d+/);
  assert.match(src, /LeadFlow/);
});
```

- [ ] **Step 2: Run to verify failure** — bundle missing.

- [ ] **Step 3: Build the bundle**

```jsx
// assets/vendor-build/entry.jsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import ReactFlow, { MiniMap, Controls, Background } from 'reactflow';
import 'reactflow/dist/style.css';

function Canvas({ map, onNodeClick }) {
  return (
    <ReactFlow nodes={map.nodes} edges={map.edges} fitView
      nodesDraggable={false} nodesConnectable={false}
      onNodeClick={(_, node) => onNodeClick?.(node)}>
      <MiniMap /> <Controls showInteractive={false} /> <Background />
    </ReactFlow>
  );
}

export function render(container, map, handlers = {}) {
  createRoot(container).render(<Canvas map={map} onNodeClick={handlers.onNodeClick} />);
}
```

```bash
cd plugins/solution-architect/skills/new-lead/assets/vendor-build
npm init -y && npm i react@18 react-dom@18 reactflow@11 esbuild
npx esbuild entry.jsx --bundle --minify --format=iife --global-name=LeadFlow \
  --loader:.css=css --banner:js='// new-lead-dashboard v1' \
  --outfile=../dashboard/vendor/reactflow-bundle.js
```

If `--loader:.css` inlining fights the IIFE build, drop the CSS import and instead copy `node_modules/reactflow/dist/style.css` to `assets/dashboard/vendor/reactflow.css`, add it to `ASSET_FILES`, and `<link>` it from detail.html. Record which route was taken in the commit body.

- [ ] **Step 4: Run smoke test** — PASS. Note bundle size in the commit body (expect roughly 300–600 KB minified; well under artifact limits, acceptable as a committed vendored asset).

- [ ] **Step 5: Commit** (no `/simplify` on generated bundle; entry.jsx is trivial) — `git commit -m "build(new-lead): vendor react-flow bundle for lead detail"`

---

### Task 3: `assets/dashboard/detail.html`

**Files:**
- Create: `assets/dashboard/detail.html`
- Delete: `assets/dashboard/detail-mockup.html` (its approved layout now lives here)
- Test: browser acceptance below

**Interfaces:**
- Consumes: `GET /api/leads/:id/map` (panels + nodes), `GET /api/leads` (registry row for header), `POST /api/leads/:id` (won/lost), `POST /api/leads/:id/notes`, `LeadFlow.render`, `/vendor/reactflow-bundle.js`.
- Lead id parsed from `location.pathname` (`/detail/<id>`); vendor script loaded as `/vendor/reactflow-bundle.js` (root-absolute — the page is served at a nested path).

- [ ] **Step 1: Implement the approved mockup** through `design-taste-frontend`, replacing the static SVG with the live canvas:

```html
<!-- new-lead-dashboard v1 -->
<script src="/vendor/reactflow-bundle.js"></script>
<script type="module">
  const id = location.pathname.split('/').pop();
  const map = await (await fetch(`/api/leads/${id}/map`)).json();
  LeadFlow.render(document.getElementById('canvas'), map, {
    onNodeClick: (node) => {
      if (node.data.href) window.open(node.data.href, '_blank');
      else if (node.data.detail) toggleInlinePanel(node);   // expand-in-place
    },
  });
  renderPanels(map.panels);  // brief (markdown → minimal client-side rendering: headings, bold, lists), facts chips, risks, open questions, activity
</script>
```

Behavior contract (from spec + approved mockup):
- `ready` nodes styled solid; `pending` grey with tooltip "unlocks at gate N" (gate number by node type: arch→1, estimate/scenario→2, proposal→3).
- Picked scenario (registry `scenario` field) gets a highlight ring.
- Notes textarea saves on blur + Ctrl/Cmd-S → `POST .../notes`, with saved/unsaved indicator.
- Won/Lost buttons mirror dashboard behavior; after POST, header pill + banner refresh.
- Next-action banner logic (pure function in the page): proposal ready → "validity expires in Nd" using `proposal.validityDays` from panels.facts when present; else first pending stage → "waiting: <stage> (gate N)"; closed lead → "won/lost on <date>".
- No external requests beyond same-origin; both themes; page never scrolls horizontally (canvas pans inside its container).

- [ ] **Step 2: Browser acceptance** against the fixture copy (`/detail/acme-crm`):

  - [ ] Canvas shows evidence → interview → arch (+components) → estimate (+scenarios) → proposal; proposal grey.
  - [ ] Click arch node opens `/acme-crm/dist/index.html` in a new tab; click estimate node (no href in fixture) expands inline detail instead — never a dead tab.
  - [ ] Exec summary renders brief.md; risks show the fixture's two; open questions show "Reporting".
  - [ ] Notes edit + reload persists (file on disk changed).
  - [ ] Won click flips header + banner; activity feed populated when the fixture copy is a git repo (`git init && git add -A && git commit -m x` in the copy first), empty-state text otherwise.
  - [ ] Both themes; minimap + zoom work; nodes not draggable.

- [ ] **Step 3: `/simplify`** on page JS, **then commit** — `git commit -m "feat(new-lead): lead detail page with lineage canvas"`

---

**Milestone exit criteria:** mockup explicitly approved by user before Task 2 started; smoke test green; browser checklist ticked.
