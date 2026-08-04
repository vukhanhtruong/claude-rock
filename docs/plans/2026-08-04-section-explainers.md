# Viewer Section Explainers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every architecture section in the generated viewer a `[?]` button that toggles a short explainer open in place, so a reader who does not recognise a heading can learn what belongs under it.

**Architecture:** A static JSON asset holds 19 explainers — 16 keyed by canonical spine heading text, 3 by companion document kind. A new `doc-kinds.mjs` classifies each input document; `doc-sections.mjs` stamps the result onto the page element as `data-kind`; the viewer template reads the JSON from a new embed slot and injects a `<button>` plus a `<details>` panel per matching heading, extending the loop that already adds `#` deep-link anchors.

**Tech Stack:** Zero-dependency Node ESM (`.mjs`), `node:test` + `node:assert/strict`, plain HTML/CSS/JS in a single self-contained template. No new dependencies.

## Global Constraints

- **Spec:** `docs/specs/2026-08-04-section-explainers-design.md`. Read it before Task 1.
- **Quality gates** (`scripts/test/quality-gates.test.mjs` enforces these on every file in `scripts/`, `scripts/lib/`, `workflows/`): max 200 lines per file, max 10 functions per file, max 22 lines per function, max 3 parameters per function. `assets/` is exempt.
- **No new dependencies.** `package.json` declares no runtime deps and must keep none.
- **Offline:** `scripts/test/offline.test.mjs` and `viewer-template.test.mjs` fail the build if any remote URL survives in the template. The one permitted host is `www.w3.org` (SVG namespaces). `scripts/test/render.test.mjs:42` runs the same check against the **generated HTML**, so a `docs.arc42.org` link inside `assets/section-help.json` would be caught too — see Task 6, which cancels that link outright.
- **Commit style:** Conventional Commits. Imperative subject, lowercase after the colon, no trailing period, 50 chars max. Never credit Claude, Claude Code, or any AI tool as author or co-author; no `Co-Authored-By`, `Claude-Session`, or "Generated with" lines.
- **Branch:** `feat/section-explainers`, already checked out. The spec is already committed as `8da5cf7`.
- **Run the tests from the repository root, and expect zero failures.**

  ```
  cd <repo-root> && node --test plugins/arch-docs/skills/arch-docs/scripts/test/*.test.mjs
  ```

  Several tests spawn `render.mjs` with fixture paths resolved relative to the repo root, so running the suite from inside `plugins/arch-docs/skills/arch-docs/` makes 7 of them fail on paths alone — nothing to do with the code under test. An earlier revision of this plan mistook those for pre-existing environment gates and told implementers to ignore them. It was wrong: from the repo root the suite is **green, and any failure is yours**. Do not treat any failure as pre-existing.

- **Working directory:** run test commands from the repository root as above. Paths given elsewhere in this plan (`assets/…`, `scripts/lib/…`) are relative to `plugins/arch-docs/skills/arch-docs/` — join them yourself rather than `cd`-ing.
- **House test style:** tests in this repo assert against the template *source string* with regexes, and each test carries a comment naming the concrete failure it prevents. Match that. Do not add a DOM library.

---

## File Structure

```
plugins/arch-docs/skills/arch-docs/
├── assets/
│   ├── section-help.json          CREATE  the 19 explainers (data only)
│   └── viewer-template.html       MODIFY  slot marker, CSS, print rule, injection loop
├── scripts/
│   ├── render.mjs                 MODIFY  wire kindOf + the new slot
│   └── lib/
│       ├── doc-kinds.mjs          CREATE  kindOf(path, index) -> kind | undefined
│       ├── section-help.mjs       CREATE  read + serialise the JSON safely
│       └── doc-sections.mjs       MODIFY  pageEl emits data-kind
└── scripts/test/
    ├── doc-kinds.test.mjs         CREATE
    ├── section-help.test.mjs      CREATE
    ├── doc-sections.test.mjs      MODIFY
    └── viewer-template.test.mjs   MODIFY
```

**Deviation from the spec, deliberate:** the spec put `kindOf` in `render.mjs`. It goes in `scripts/lib/doc-kinds.mjs` instead, because `render.mjs` executes top-level code on import (see `render.mjs:58` onward) — `render.test.mjs` can only reach it by spawning it with `execFileSync`. A classifier that cannot be unit-tested cannot be built test-first. Same reason for `section-help.mjs`. Both also keep `render.mjs` inside the 200-line and 10-function gates.

---

### Task 1: The document-kind classifier

**Files:**
- Create: `scripts/lib/doc-kinds.mjs`
- Test: `scripts/test/doc-kinds.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: `kindOf(path, index)` → `'spine' | 'threat-model' | 'estimation' | 'domain-overview' | undefined`. `path` is a filesystem path (relative or absolute — only the basename is read). `index` is the document's position in the `--docs` list, where `0` is `ARCHITECTURE.md`.

- [ ] **Step 1: Write the failing test**

Create `scripts/test/doc-kinds.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kindOf } from '../lib/doc-kinds.mjs';

// Index 0 is ARCHITECTURE.md by construction — render.mjs already flags it this
// way with `spine: i === 0`. Nothing reads its filename, because a target repo
// is free to call it something else.
test('the first document is the spine whatever it is called', () => {
  assert.equal(kindOf('ARCHITECTURE.md', 0), 'spine');
  assert.equal(kindOf('docs/design/system.md', 0), 'spine');
});

test('the three fixed-name companions are recognised', () => {
  assert.equal(kindOf('docs/threat-model.md', 1), 'threat-model');
  assert.equal(kindOf('docs/estimation.md', 2), 'estimation');
  assert.equal(kindOf('docs/DOMAIN-OVERVIEW.md', 3), 'domain-overview');
});

// A repo that writes THREAT-MODEL.md is writing the same document.
test('companion matching ignores case', () => {
  assert.equal(kindOf('docs/THREAT-MODEL.md', 1), 'threat-model');
  assert.equal(kindOf('docs/Domain-Overview.md', 2), 'domain-overview');
});

// Everything with no kind renders exactly as it does today. These are the four
// document classes the spec deliberately excludes, and each one silently
// acquiring an explainer is the regression this test exists to catch.
test('excluded document classes get no kind', () => {
  assert.equal(kindOf('docs/adr/0001-use-postgres.md', 1), undefined);
  assert.equal(kindOf('src/billing/CONTEXT.md', 2), undefined);
  assert.equal(kindOf('CONTEXT-MAP.md', 3), undefined);
  assert.equal(kindOf('docs/openapi.yaml', 4), undefined);
  assert.equal(kindOf('docs/whatever.md', 5), undefined);
});

// A companion name at index 0 is still the spine: the position wins, because a
// set whose root document is called estimation.md would otherwise lose its 16
// section explainers and gain one wrong one.
test('position beats filename', () => {
  assert.equal(kindOf('docs/estimation.md', 0), 'spine');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test scripts/test/doc-kinds.test.mjs`
Expected: FAIL — `Cannot find module '.../lib/doc-kinds.mjs'`

- [ ] **Step 3: Write the minimal implementation**

Create `scripts/lib/doc-kinds.mjs`:

```js
import { basename } from 'node:path';

// The three companions with fixed basenames. interface-contract is absent on
// purpose: its filename is stack-dependent (OpenAPI, tool schemas, data
// contracts, a wire protocol), and if it ships as raw .yaml or .proto it never
// reaches renderMarkdown at all. Excluded rather than guessed at.
const COMPANIONS = new Map([
  ['threat-model.md', 'threat-model'],
  ['estimation.md', 'estimation'],
  ['domain-overview.md', 'domain-overview'],
]);

// Position, not filename, identifies the spine: render.mjs passes ARCHITECTURE.md
// as docs[0] and a target repo may call it anything. Everything unmatched returns
// undefined and renders exactly as it does today — ADRs, CONTEXT.md,
// CONTEXT-MAP.md and the interface contract are all excluded by the spec.
export function kindOf(path, index) {
  if (index === 0) return 'spine';
  return COMPANIONS.get(basename(path).toLowerCase());
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test scripts/test/doc-kinds.test.mjs`
Expected: PASS — 5 tests.

- [ ] **Step 5: Confirm the quality gates still pass**

Run: `node --test scripts/test/quality-gates.test.mjs`
Expected: PASS. The new file is 1 function and ~20 lines.

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/doc-kinds.mjs scripts/test/doc-kinds.test.mjs
git commit -m "feat(arch-docs): classify documents by kind"
```

---

### Task 2: The explainer content

**Files:**
- Create: `assets/section-help.json`
- Create: `scripts/lib/section-help.mjs`
- Test: `scripts/test/section-help.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: `SPINE_TITLES` — a frozen array of the 16 canonical heading strings, in spine order. `sectionHelp()` → the parsed object `{ spine: {...}, companions: {...} }`. `serialiseHelp(help)` → a JS-embeddable string with `<` escaped as `<`.

Each explainer has three required string fields — `what`, `why`, `good` — and no other fields. Task 6 considers and cancels an `arc42` field; see its scope note.

- [ ] **Step 1: Write the failing test**

Create `scripts/test/section-help.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SPINE_TITLES, sectionHelp, serialiseHelp } from '../lib/section-help.mjs';

const help = sectionHelp();

// references/writing.md states the spine headings never change, which is what
// makes the heading text a usable key. If a heading is renamed there, this test
// is the thing that says the explainer no longer reaches it.
test('every canonical spine heading has an explainer', () => {
  assert.equal(SPINE_TITLES.length, 16);
  for (const title of SPINE_TITLES) {
    assert.ok(help.spine[title], `no explainer for "${title}"`);
  }
});

// An entry keyed on a heading that does not exist is dead weight that looks
// like coverage.
test('no explainer is keyed on a heading that does not exist', () => {
  assert.deepEqual(Object.keys(help.spine).sort(), [...SPINE_TITLES].sort());
});

test('the three elected companions have an explainer and nothing else does', () => {
  assert.deepEqual(Object.keys(help.companions).sort(),
    ['domain-overview', 'estimation', 'threat-model']);
});

// An empty field renders as a blank row in the panel, which reads as a bug
// rather than as an absence.
test('every explainer states all three fields', () => {
  const all = [...Object.entries(help.spine), ...Object.entries(help.companions)];
  assert.equal(all.length, 19);
  for (const [key, entry] of all) {
    for (const field of ['what', 'why', 'good']) {
      assert.equal(typeof entry[field], 'string', `${key}.${field} is not a string`);
      assert.ok(entry[field].trim().length > 20, `${key}.${field} is too short to help`);
    }
  }
});

// The JSON is embedded into an inline <script> the same way THEME is. Prose is
// author-written and may legitimately contain "<", so an unescaped "</script"
// anywhere in it would end the element early and inject the rest as markup.
// themeJson gets away with a raw splice because a palette file is hex and keys;
// this is sentences.
test('serialising escapes every < so it cannot close the script element', () => {
  const out = serialiseHelp({ spine: { X: { what: 'a </script> b', why: 'c', good: 'd' } } });
  assert.doesNotMatch(out, /</);
  assert.match(out, /\\u003c/);
  assert.deepEqual(JSON.parse(out).spine.X.what, 'a </script> b');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test scripts/test/section-help.test.mjs`
Expected: FAIL — `Cannot find module '.../lib/section-help.mjs'`

- [ ] **Step 3: Write the content asset**

Create `assets/section-help.json`. Field meanings: `what` is what belongs in the section, `why` is what goes wrong without it, `good` is a concrete test the section either passes or fails.

```json
{
  "spine": {
    "Goals & Scope": {
      "what": "The two or three outcomes this system exists to deliver, who it serves, and an explicit list of what it will not do.",
      "why": "Without a stated boundary every later section drifts. The out-of-scope half is the one that prevents argument later.",
      "good": "A reader can name something plausible that the system deliberately does not do."
    },
    "Constraints": {
      "what": "Fixed conditions the design had no freedom over: mandated technology, budget, deadlines, compliance regimes, team skills, existing systems it must interoperate with.",
      "why": "A constraint recorded as a decision invites someone to relitigate it. Recorded as a constraint, it tells them who to go and ask instead.",
      "good": "Every entry names who or what imposes it, not merely that it holds."
    },
    "Project Structure": {
      "what": "The directory tree to depth two, and which architectural boundary each top-level directory maps to.",
      "why": "The tree is the first thing a new contributor reads and the last thing anyone documents. Left implicit, folder names become the de facto architecture.",
      "good": "Someone can map a feature request to a directory without resorting to grep."
    },
    "Solution Strategy": {
      "what": "The handful of decisions that shaped everything else, each pointing at the decision record that argued it.",
      "why": "This is what a reader consults to learn why the system is like this at all, before spending an hour in the detail.",
      "good": "Five bullets or fewer, each linking a decision record, none restating the rationale."
    },
    "Architecture Model": {
      "what": "The C4 views of the system, from context down through containers to components, as diagrams rather than prose.",
      "why": "A structural claim buried in a paragraph cannot be checked. In a diagram, a missing dependency is visible.",
      "good": "The diagrams answer what talks to what without a sentence of help."
    },
    "Core Components": {
      "what": "Each significant building block: what it is responsible for, what it is built with, where it deploys, which paths hold it, and what must always be true of it.",
      "why": "Responsibility is the thing people actually disagree about. Written down, a component that has quietly acquired three jobs becomes visible.",
      "good": "Every row states one responsibility. A row that needs the word \"and\" is either two components or a problem."
    },
    "Runtime Behaviour": {
      "what": "Two to four named flows through the system as dynamic views: request paths, scheduled work, failure handling.",
      "why": "Structure says what exists, never what happens. Most defects live in an ordering that no structure diagram can show.",
      "good": "Each flow is named for something a stakeholder would recognise, not for the components it happens to touch."
    },
    "Data Stores": {
      "what": "Every persistent store: a diagram of its shape, plus type, purpose, retention, whether it holds personal data, and how it is migrated.",
      "why": "Data outlives the code that wrote it. Retention and personal-data flags are the two facts nobody can reconstruct afterwards.",
      "good": "Every store names a retention period and a migration tool, including where the honest answer is none. The shape here is how data is stored, which is not the same thing as what the business means by it."
    },
    "External Integrations": {
      "what": "Every system across the boundary: how it is called, how it is authenticated and where that credential lives, what happens when it fails, its rate limit and cost, what data leaves, and how hard it would be to replace.",
      "why": "External dependencies are where availability and compliance are really decided, and they are usually recorded as a name and a URL.",
      "good": "Every entry states a failure mode, so \"it is down, then what\" has an answer for each row."
    },
    "Deployment & Infrastructure": {
      "what": "Where the system runs, per environment, and the pipeline stages that put it there.",
      "why": "The gap between the documented architecture and the deployed reality is where incidents come from.",
      "good": "A reader can tell which environments exist and what differs between them."
    },
    "Crosscutting Concepts": {
      "what": "The patterns that apply everywhere rather than in one place: observability, error handling, validation, configuration and secrets, authentication mechanics, testing strategy.",
      "why": "A concern documented per component gets documented inconsistently. One home means one answer.",
      "good": "A contributor adding a component knows what it must do about logging and errors without having to ask."
    },
    "Security": {
      "what": "The trust boundaries as a data-flow diagram, the authorisation model, and a link to the threat model.",
      "why": "Security stated as an intention is not reviewable. Boundaries and an authorisation model are.",
      "good": "Every boundary crossing on the diagram has a stated authentication mechanism."
    },
    "Quality Requirements & SLOs": {
      "what": "The quality attributes that matter here, each with a number and a way of measuring it.",
      "why": "Fast, reliable and scalable are unfalsifiable. A number is something a test can fail against.",
      "good": "No entry is an adjective. Each carries a value and a measurement method."
    },
    "Decisions": {
      "what": "The index of architecture decision records: what was decided, its current status, and where the full record lives.",
      "why": "The reasoning behind a decision decays faster than the code implementing it. A decision record is what stops the same debate recurring every year.",
      "good": "Every record states the options that were considered, not only the one chosen."
    },
    "Risks & Technical Debt": {
      "what": "Known weaknesses: what could go wrong, what is already wrong, and what has been deliberately deferred.",
      "why": "Debt nobody wrote down is indistinguishable from a design choice, and eventually gets defended as one.",
      "good": "Each entry says what would trigger acting on it."
    },
    "Glossary": {
      "what": "The domain and technical terms these documents use, defined once.",
      "why": "Two people using one word for two things is the most expensive ambiguity a project can carry and the cheapest to fix.",
      "good": "Every term a newcomer would have to ask about appears exactly once, here."
    }
  },
  "companions": {
    "threat-model": {
      "what": "A data-flow diagram with its trust boundaries, the threats identified against it, and the mitigation for each.",
      "why": "A threat list without a diagram cannot be checked for completeness, and a diagram without a list is decoration.",
      "good": "Every threat has either a mitigation or an explicit note that the risk was accepted."
    },
    "estimation": {
      "what": "Effort estimates per scope item, each carrying a confidence level and the assumptions it rests on.",
      "why": "An estimate without its assumptions is a number that gets held against you once the assumptions change.",
      "good": "Nothing unestimated reads as zero. It reads as not estimated."
    },
    "domain-overview": {
      "what": "Three parts and nothing else: the actors, the processes they drive, and the business rules that govern them.",
      "why": "A data model shows how information is stored, never what the business means by it. The two legitimately differ.",
      "good": "Every rule links the component that enforces it and the decision it came from."
    }
  }
}
```

- [ ] **Step 4: Write the loader**

Create `scripts/lib/section-help.mjs`:

```js
import { readFileSync } from 'node:fs';

// Verbatim from references/writing.md's 16-heading spine, in spine order. The
// lookup keys on this text rather than on a slug for two reasons: slugify keeps
// both spaces around a stripped "&", so "Goals & Scope" becomes goals--scope;
// and h2/h3 ids share one dedupe registry, so an h3 named Security under
// Crosscutting Concepts would take `security` and demote §12's h2 to security-2.
export const SPINE_TITLES = Object.freeze([
  'Goals & Scope', 'Constraints', 'Project Structure', 'Solution Strategy',
  'Architecture Model', 'Core Components', 'Runtime Behaviour', 'Data Stores',
  'External Integrations', 'Deployment & Infrastructure', 'Crosscutting Concepts',
  'Security', 'Quality Requirements & SLOs', 'Decisions',
  'Risks & Technical Debt', 'Glossary',
]);

export function sectionHelp() {
  const url = new URL('../../assets/section-help.json', import.meta.url);
  return JSON.parse(readFileSync(url, 'utf8'));
}

// The result is spliced into an inline <script>, so a "</script" sequence
// anywhere in the prose would close the element early and inject the remainder
// as markup. Escaping "<" is enough to make that impossible and still parses as
// JSON. THEME gets away with a raw splice because a palette file is hex and
// keys; this is author-written sentences.
export function serialiseHelp(help) {
  return JSON.stringify(help).replace(/</g, '\\u003c');
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `node --test scripts/test/section-help.test.mjs`
Expected: PASS — 5 tests.

- [ ] **Step 6: Confirm the quality gates still pass**

Run: `node --test scripts/test/quality-gates.test.mjs`
Expected: PASS. `section-help.mjs` is 2 functions and ~30 lines. `assets/` is not scanned.

- [ ] **Step 7: Commit**

```bash
git add assets/section-help.json scripts/lib/section-help.mjs scripts/test/section-help.test.mjs
git commit -m "feat(arch-docs): add section explainer content"
```

---

### Task 3: Stamp the document kind onto the page element

**Files:**
- Modify: `scripts/lib/doc-sections.mjs:33-38` (`pageEl`)
- Test: `scripts/test/doc-sections.test.mjs`

**Interfaces:**
- Consumes: `kindOf` from Task 1 (via `render.mjs` in Task 4 — this task only reads `page.kind`).
- Produces: `<section class="page">` elements carrying `data-kind="<kind>"` when `page.kind` is set, and no `data-kind` attribute at all when it is not. Task 5's injection loop selects on this attribute.

- [ ] **Step 1: Write the failing test**

Append to `scripts/test/doc-sections.test.mjs`:

```js
// The injection loop selects [data-kind="spine"] h2, so the attribute is the
// only thing telling the client which document is the spine and which of the
// three companions each other document is. Absent, every explainer is missing.
test('a page carries its document kind', () => {
  const html = buildDoc([
    { docId: 'a', title: 'Arch', html: '<h2>x</h2>', headings: [], kind: 'spine' },
  ]);
  assert.match(html, /data-kind="spine"/);
});

// A document with no kind renders exactly as it does today. An empty
// data-kind="" would match [data-kind] selectors and is worse than absence.
test('a page with no kind carries no kind attribute', () => {
  const html = buildDoc([
    { docId: 'b', title: 'ADR 1', html: '<h2>x</h2>', headings: [] },
  ]);
  assert.doesNotMatch(html, /data-kind/);
});
```

If `buildDoc` and `assert` are not already imported at the top of that file, add them:

```js
import { buildDoc } from '../lib/doc-sections.mjs';
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test scripts/test/doc-sections.test.mjs`
Expected: FAIL — `a page carries its document kind` fails, because no `data-kind` is emitted.

- [ ] **Step 3: Write the minimal implementation**

In `scripts/lib/doc-sections.mjs`, replace `pageEl`:

```js
function pageEl(page, route) {
  const title = escapeHtml(stripTitle(page.title));
  const at = route ? ` data-route="${route}"` : '';
  // Omitted rather than emptied when there is no kind: data-kind="" still
  // matches a [data-kind] selector, so an unclassified document would look
  // classified to the injection loop.
  const kind = page.kind ? ` data-kind="${escapeHtml(page.kind)}"` : '';
  return `<section class="page" id="page-${page.docId}"${at}${kind} data-title="${title}">`
    + `\n${page.html}\n</section>`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test scripts/test/doc-sections.test.mjs`
Expected: PASS — the whole file, including the pre-existing tests.

- [ ] **Step 5: Confirm nothing else regressed**

Run: `node --test scripts/test/*.test.mjs`
Expected: same failures as the recorded baseline, no new ones.

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/doc-sections.mjs scripts/test/doc-sections.test.mjs
git commit -m "feat(arch-docs): stamp document kind on page elements"
```

---

### Task 4: Wire the classifier and the slot through the renderer

**Files:**
- Modify: `scripts/render.mjs:63-69` (page construction) and `:97-107` (the `embed` call)
- Modify: `assets/viewer-template.html:1091` region (add the slot marker)
- Test: `scripts/test/viewer-template.test.mjs:8-13` (the slot-count test) and `scripts/test/viewer-template.test.mjs:26-37` (the embed test)

**Interfaces:**
- Consumes: `kindOf` (Task 1), `sectionHelp` and `serialiseHelp` (Task 2), `data-kind` emission (Task 3).
- Produces: a template containing `<!-- slot:SECTION_HELP -->`, and rendered output where `window.ARCH_DOCS_HELP` is assigned the serialised explainer object. Task 5's loop reads that global.

`embed.mjs` is a strict two-way check — every marker needs slot content and every slot needs a marker — so the marker and the `slots` key must land in the same commit or the render throws.

- [ ] **Step 1: Update the two template tests to expect the eighth slot**

In `scripts/test/viewer-template.test.mjs`, change the slot list (currently seven entries) to eight, and rename the test:

```js
test('template has exactly the eight slots and no external URLs', () => {
  const markers = [...tpl.matchAll(/<!-- slot:(\w+) -->/g)].map((m) => m[1]).sort();
  assert.deepEqual(markers,
    ['DOC', 'FONTS', 'LIKEC4_BUNDLE', 'MERMAID_BUNDLE', 'NAV', 'SECTION_HELP', 'THEME', 'TITLE']);
  assert.doesNotMatch(tpl, /https?:\/\/(?!www\.w3\.org)/);
});
```

And add `SECTION_HELP` to the `slots` object in the `template embeds cleanly` test:

```js
    FONTS: '/*fonts*/', SECTION_HELP: '{"spine":{},"companions":{}}',
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test scripts/test/viewer-template.test.mjs`
Expected: FAIL on both — the marker list is missing `SECTION_HELP`, and `embed` throws `slot(s) without marker: SECTION_HELP`.

- [ ] **Step 3: Add the marker to the template**

In `assets/viewer-template.html`, find this line (near 1091):

```
window.ARCH_DOCS_THEME = <!-- slot:THEME -->;
```

Add the explainer global directly beneath it:

```
window.ARCH_DOCS_THEME = <!-- slot:THEME -->;
/* Guidance about the template, not claims about the documented system, so it
   sits outside the observed/stated/researched/proposed provenance rules. Data
   only: the loop below decides what to render from it. */
window.ARCH_DOCS_HELP = <!-- slot:SECTION_HELP -->;
```

- [ ] **Step 4: Wire the renderer**

In `scripts/render.mjs`, add the two imports beside the existing ones:

```js
import { kindOf } from './lib/doc-kinds.mjs';
import { sectionHelp, serialiseHelp } from './lib/section-help.mjs';
```

Add `kind` to the page objects (the existing block at `:63-69`):

```js
const pages = docPaths.map((p, i) => ({
  ...renderMarkdown(readFileSync(p, 'utf8'), slugs, docSlugs),
  section: sectionOf(p, i),
  path: resolve(p),
  spine: i === 0,
  drawer: drawerOf(p, i),
  kind: kindOf(p, i),
}));
```

Add the slot to the `embed` call, beside `THEME`:

```js
    SECTION_HELP: serialiseHelp(sectionHelp()),
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test scripts/test/viewer-template.test.mjs scripts/test/render.test.mjs`
Expected: the two slot tests PASS. `render.test.mjs` shows only its two pre-existing baseline failures.

- [ ] **Step 6: Confirm the quality gates still pass**

Run: `node --test scripts/test/quality-gates.test.mjs`
Expected: PASS. `render.mjs` gains two imports and two lines; it was 114 lines against a 200 cap, and gains a sixth function-equivalent against a cap of 10.

- [ ] **Step 7: Commit**

```bash
git add scripts/render.mjs assets/viewer-template.html scripts/test/viewer-template.test.mjs
git commit -m "feat(arch-docs): embed section help in the viewer"
```

---

### Task 5: The button, the panel, and the injection loop

**Files:**
- Modify: `assets/viewer-template.html` — CSS after `:451`, the print rule before `:1003`, the injection loop at `:1183-1191`
- Test: `scripts/test/viewer-template.test.mjs`

**Interfaces:**
- Consumes: `window.ARCH_DOCS_HELP` (Task 4), `data-kind` on `.page` (Task 3).
- Produces: rendered `button.help-btn[aria-expanded]` inside matching headings, each followed by a `details.help` panel. Nothing else depends on this.

- [ ] **Step 1: Write the failing tests**

Append to `scripts/test/viewer-template.test.mjs`:

```js
/* ---------- section explainers ---------- */

// The viewer explains the system and never the sections themselves, so a reader
// who lands on a heading they do not recognise has nowhere to turn. arc42 heads
// each chapter with a fixed explanation; this is the same affordance.
test('a spine heading gets a help toggle bound to a details panel', () => {
  const fn = tpl.match(/function injectSectionHelp[\s\S]*?\n\}/)[0];
  // Keyed on heading text, not on the id: slugify keeps both spaces around a
  // stripped "&", and h2/h3 share one dedupe registry, so the slug can shift
  // under a heading without anything failing.
  assert.doesNotMatch(fn, /\.id\]/, 'keying on the id is the bug this avoids');
  assert.match(fn, /ARCH_DOCS_HELP/);
  // The panel is built in helpPanel, so scope that assertion to helpPanel — a
  // regex window over injectSectionHelp cannot see it.
  const panel = tpl.match(/function helpPanel[\s\S]*?\n\}/)[0];
  assert.match(panel, /'details'/);
  assert.match(panel, /help__body/);
});

// The anchor loop prepends a '#' to the heading, so reading textContent after it
// runs looks up "#Core Components" and finds nothing. Scoped to the loop body,
// because `function injectSectionHelp(h, title)` also contains the call pattern
// and sits above the loop — matching against the whole file would pass on the
// declaration and prove nothing about the order things actually happen in.
test('the heading text is read before the deep-link anchor is prepended', () => {
  const loop = tpl.match(/document\.querySelectorAll\('\.doc h1[\s\S]*?\n\}\);/)[0];
  const read = loop.indexOf('h.textContent');
  const call = loop.indexOf('injectSectionHelp(');
  const prepend = loop.indexOf('h.prepend(a)');
  assert.ok(read >= 0, 'the loop never reads the heading text');
  assert.ok(call >= 0, 'help is not injected in the heading pass');
  assert.ok(read < prepend, 'the title is read after the anchor is prepended');
  assert.ok(call < prepend, 'the explainer is injected after the anchor is prepended');
});

// A toggle that does not say which way it is set is unreadable to a screen
// reader, and the viewer already holds this line for its other toggles.
test('the help toggle reports its own state and names what it controls', () => {
  const fn = tpl.match(/function injectSectionHelp[\s\S]*?\n\}/)[0];
  assert.match(fn, /aria-expanded/);
  assert.match(fn, /aria-label/, 'the button needs an accessible name');
  // The panel's summary is hidden because the button drives it, so aria-controls
  // is the only thing tying the state to the thing in that state.
  assert.match(fn, /aria-controls/);
  assert.match(fn, /panel\.id/);
});

// Reading progress is derived from scroll offsets, so a panel opening under the
// heading moves the readout. The move is reader-initiated, so recomputing is
// enough — but nothing recomputes on its own.
test('opening a panel resettles the reading progress readout', () => {
  const fn = tpl.match(/function injectSectionHelp[\s\S]*?\n\}/)[0];
  assert.match(fn, /tick\(\)/, 'the progress readout keeps a stale span');
});

// Companion documents get one explainer under the h1, keyed by kind rather than
// by heading text — the spec scopes per-heading explainers to the spine only.
test('a companion document is explained once, at its title', () => {
  const fn = tpl.match(/function injectSectionHelp[\s\S]*?\n\}/)[0];
  assert.match(fn, /companions/);
  // The kind is read as a property, so assert on the access the code performs.
  // Grepping the template for the literal "data-kind" finds nothing: the
  // attribute is written by pageEl in scripts/lib/doc-sections.mjs, not here.
  assert.match(fn, /dataset\.kind/);
  assert.match(fn, /tagName === 'H1'/, 'a companion is explained at its title');
});

// Excluded by the spec: §14 Decisions is already a spine section and already the
// home for what an ADR is, so a per-record explainer is that guidance a second
// time across seventeen records.
test('only the spine gets per-heading explainers', () => {
  const fn = tpl.match(/function injectSectionHelp[\s\S]*?\n\}/)[0];
  assert.match(fn, /\[data-kind="spine"\]|kind === 'spine'/);
  assert.doesNotMatch(fn, /h3/, 'subheadings are out of scope');
});

// The button is chrome. Paper gets the prose, and a closed panel prints closed.
test('print drops the help toggle', () => {
  const print = tpl.match(/@media print \{[\s\S]*?\n\}/)[0];
  assert.match(print, /\.help-btn/);
});

test('the help panel and its toggle are styled', () => {
  assert.match(tpl, /\.help-btn \{/);
  assert.match(tpl, /details\.help \{|\.help \{/);
  // A 40px hit area is the standard this template already holds for icon buttons.
  assert.match(tpl, /\.help-btn::after \{[^}]*inset:/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test scripts/test/viewer-template.test.mjs`
Expected: FAIL — the first test throws on `tpl.match(...)[0]` because `injectSectionHelp` does not exist.

- [ ] **Step 3: Add the CSS**

In `assets/viewer-template.html`, insert after line 455 (the closing brace of `.main :is(h2, h3)`):

```css
/* The section explains the system; this explains the section. Click, not hover:
   the text is too long for a tooltip, and a hover-only control is unreachable
   from a keyboard and on a touch screen. */
.help-btn {
  position: relative; margin-left: .4em; padding: 0;
  width: 1.15em; height: 1.15em; vertical-align: .06em;
  border: 1px solid var(--border); border-radius: 50%;
  background: none; color: var(--text-faint);
  font: 600 .62em/1.15 var(--font-body); cursor: pointer;
  transition: color .13s, border-color .13s;
}
.help-btn:hover { color: var(--text); border-color: var(--text-faint); }
.help-btn::after { content: ''; position: absolute; inset: -12px; }
.help-btn[aria-expanded="true"] { color: var(--accent); border-color: var(--accent); }
details.help { margin: 0 0 18px; }
details.help > summary { display: none; }
.help__body {
  border-left: 2px solid var(--border); padding: 2px 0 2px 14px;
  color: var(--text-dim); font-size: .94em;
}
.help__body p { margin: 0 0 6px; }
.help__body b { color: var(--text); font-weight: 600; }
.help__body a { font-size: .92em; }
```

All five custom properties used above are ones this template already defines. The full set available to you is `--text`, `--text-dim`, `--text-faint`, `--border`, `--border-strong`, `--accent`, `--accent-soft`, `--accent-line`, `--surface`, `--surface-2`, `--surface-3`, `--font-body`, `--font-display`, `--font-mono`. Do not introduce a new custom property and do not hardcode a hex — both themes are driven off this set, and a literal colour would not flip with the toggle.

- [ ] **Step 4: Add the print rule**

In the `@media print` block, before its closing brace at line 1003:

```css
  /* A control on paper is a control nobody can press. The panel is a closed
     <details> and prints closed, which leaves the document as authored. */
  .help-btn { display: none; }
```

- [ ] **Step 5: Write the injection loop**

Replace the block at `assets/viewer-template.html:1183-1191` entirely:

```js
/* ---- deep-link anchors and section explainers on every heading ---- */
/* One pass, and the order inside it matters: the anchor prepends a '#' to the
   heading, so the title has to be read before that happens or every lookup
   misses by one character. */
function helpPanel(entry) {
  var d = document.createElement('details');
  d.className = 'help';
  var body = document.createElement('div');
  body.className = 'help__body';
  body.appendChild(helpRow('What goes here', entry.what));
  body.appendChild(helpRow('Why it matters', entry.why));
  body.appendChild(helpRow('What good looks like', entry.good));
  d.appendChild(document.createElement('summary'));
  d.appendChild(body);
  return d;
}

function helpRow(label, text) {
  var p = document.createElement('p');
  var b = document.createElement('b');
  b.textContent = label + ' — ';
  p.appendChild(b);
  p.appendChild(document.createTextNode(text));
  return p;
}

var helpSeq = 0;

function injectSectionHelp(h, title) {
  var help = window.ARCH_DOCS_HELP || {};
  var page = h.closest('.page');
  var kind = page && page.dataset.kind;
  var entry = h.tagName === 'H1'
    ? (help.companions || {})[kind]
    : (kind === 'spine' ? (help.spine || {})[title] : null);
  if (!entry) return;
  var panel = helpPanel(entry);
  /* aria-expanded says a state; aria-controls says what is in that state. The
     panel's summary is hidden because the button drives it, so this pairing is
     the only thing connecting the two for a screen reader. */
  helpSeq += 1;
  panel.id = 'help-' + helpSeq;
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'help-btn';
  btn.textContent = '?';
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-controls', panel.id);
  btn.setAttribute('aria-label', 'What belongs in ' + title);
  h.appendChild(btn);
  h.after(panel);
  btn.addEventListener('click', function () {
    panel.open = !panel.open;
    btn.setAttribute('aria-expanded', String(panel.open));
    /* Reading progress is measured from scroll offsets, so the panel changing
       the section's height leaves the readout stale until the next scroll. */
    tick();
  });
}

/* h1 for a companion document's single explainer, h2 for the spine's sixteen.
   h3 is out of scope, and only the spine gets per-heading explainers: §14
   Decisions is itself a spine section and already the home for what a decision
   record is, so a per-record explainer would be that guidance seventeen times. */
document.querySelectorAll('.doc h1.doc-head, .doc h2[id], .doc h3[id]').forEach(function (h) {
  var title = h.textContent.trim();
  injectSectionHelp(h, title);
  if (h.tagName === 'H1') return;
  var a = document.createElement('a');
  a.className = 'anchor';
  a.href = '#' + h.id;
  a.textContent = '#';
  a.setAttribute('aria-label', 'Link to ' + title);
  h.prepend(a);
});
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `node --test scripts/test/viewer-template.test.mjs`
Expected: PASS — including the pre-existing `a deep-linked heading marks where the reader landed` and every other template test.

- [ ] **Step 7: Run the whole suite**

Run: `node --test scripts/test/*.test.mjs`
Expected: the recorded baseline failures only. Pay attention to `no rule is declared twice` and `every interactive surface shows the same focus ring` — if the latter fails, add `.help-btn` to the same `:focus-visible` treatment the other controls share.

- [ ] **Step 8: Commit**

```bash
git add assets/viewer-template.html scripts/test/viewer-template.test.mjs
git commit -m "feat(arch-docs): toggle explainers in the viewer"
```

---

### Task 6: Settle the README's arc42 count

**Files:**
- Modify: `plugins/arch-docs/skills/arch-docs/README.md:8` **or** nothing, depending on what you find

**Interfaces:**
- Consumes: nothing. Produces: nothing. This task changes no code.

**Scope changed mid-execution — read this before the steps.** The original plan had each explainer carry an `arc42` chapter number and render a link to `docs.arc42.org`. That is cancelled. Both `scripts/test/viewer-template.test.mjs` and `scripts/test/render.test.mjs:42` assert `doesNotMatch(..., /https?:\/\/(?!www\.w3\.org)/)` — the second one against the **generated HTML**, so an outbound URL cannot live in the template *or* in `assets/section-help.json`. The explainers carry `what`, `why`, `good` and nothing else. **Do not add an `arc42` field to the JSON, do not add a link, and do not add a text pointer.**

What survives is the documentation question underneath it, which is worth settling on its own: `README.md:8` describes the spine as "a fixed 16-section spine (arc42 + 2 additions)", and that count looks wrong.

- [ ] **Step 1: Read the arc42 chapter list from the source**

Fetch `https://docs.arc42.org/home/` and write down the twelve chapter numbers and titles. Do not work from memory — a verified list is the whole point.

- [ ] **Step 2: Map our 16 headings against those 12 chapters**

The 16 are listed in `plugins/arch-docs/skills/arch-docs/references/writing.md:16-33`. For each, record whether it has a direct arc42 counterpart, and note where one of our sections splits an arc42 chapter or merges two.

Expect ambiguity, and resolve it explicitly rather than silently: our "Architecture Model" and "Core Components" look like a split of a single arc42 chapter, and "Security" may be a standalone section where arc42 folds the same material into Crosscutting Concepts. A split is not an addition. State which reading you took.

- [ ] **Step 3: Settle the README**

Count the headings with no arc42 counterpart. If that count is 2, the README is already right and this task changes nothing — say so in your report and skip to Step 5.

If it is not 2, correct the clause in `README.md:8` to the number you counted. Keep the edit to that clause; do not restructure the file, and do not touch the 16-item list beneath it.

- [ ] **Step 4: Record the mapping where it will be found again**

Add the mapping as a short table in `references/writing.md`, under the existing spine list — which of our 16 map to which arc42 chapter, and which are ours. This is the artifact that stops the next person re-deriving it.

- [ ] **Step 5: Commit**

Skip this step entirely if nothing changed.

```bash
git add plugins/arch-docs/skills/arch-docs/README.md plugins/arch-docs/skills/arch-docs/references/writing.md
git commit -m "docs(arch-docs): map the spine to arc42 chapters"
```

---

### Task 7: Verify it in a real browser

**Files:**
- Modify: `scripts/test/browser.test.mjs`
- Modify: `references/viewer.md`

**Interfaces:**
- Consumes: everything above.
- Produces: nothing.

Commit `4c367d3` established that the viewer is verified in a real browser, not only as a source string. Source-string tests cannot tell you the panel actually opens.

- [ ] **Step 1: Confirm the browser harness runs at all**

Run: `node --test scripts/test/browser.test.mjs`

If it fails because Chrome is missing, read `scripts/lib/chrome.mjs` and `references/viewer.md:217-230` for how it locates a browser, and get it running before writing anything. Do not skip to Step 2 with a harness that cannot execute — a browser test that never runs is worse than none, because it reads as coverage.

- [ ] **Step 2: Write the failing test**

The harness renders the `docs-pass` fixture set with `render.mjs` and drives the page over CDP. The API is `await page.eval('<js expression>')` and `page.errors`. The fixture is called with `--arch ARCHITECTURE.md --docs docs/adr/0001-sample.md reflow.md`, so `ARCHITECTURE.md` is index 0 and gets `data-kind="spine"`, and the other two get no kind at all — which makes the negative case free.

`scripts/test/fixtures/docs-pass/ARCHITECTURE.md:11` uses the exact heading `## Core Components`, so it is the text-keyed lookup's target.

Add inside the existing `describe('the viewer in a real browser', ...)` block:

```js
// Template text says the loop is present. It cannot say the button was built,
// that the lookup hit, or that a click opens anything — the panel is created in
// script from a global, so a boot-order or key mistake shows up only here.
test('a spine heading offers an explainer that opens on click', async () => {
  const found = await page.eval(`(() => {
    var h = [].slice.call(document.querySelectorAll('[data-kind="spine"] h2'))
      .filter(function (el) { return el.textContent.indexOf('Core Components') >= 0; })[0];
    if (!h) return { err: 'no Core Components heading under a spine page' };
    var btn = h.querySelector('.help-btn');
    if (!btn) return { err: 'no help button in the heading' };
    var panel = h.nextElementSibling;
    return {
      tag: panel && panel.tagName,
      cls: panel && panel.className,
      expanded: btn.getAttribute('aria-expanded'),
      controls: btn.getAttribute('aria-controls'),
      panelId: panel && panel.id,
      open: panel && panel.open,
    };
  })()`);
  assert.equal(found.err, undefined, found.err);
  assert.equal(found.tag, 'DETAILS');
  assert.equal(found.cls, 'help');
  assert.equal(found.expanded, 'false', 'a closed panel must not report itself open');
  assert.equal(found.controls, found.panelId, 'aria-controls does not reach the panel');
  assert.equal(found.open, false);
});

// The reason the panel is a <details> driven by a button rather than a bare
// summary: the state has to be readable from the button, and both have to agree.
test('clicking the explainer toggles both the panel and the button state', async () => {
  const cycle = await page.eval(`(() => {
    var h = [].slice.call(document.querySelectorAll('[data-kind="spine"] h2'))
      .filter(function (el) { return el.textContent.indexOf('Core Components') >= 0; })[0];
    var btn = h.querySelector('.help-btn');
    var panel = h.nextElementSibling;
    btn.click();
    var opened = { open: panel.open, aria: btn.getAttribute('aria-expanded'),
      text: panel.textContent };
    btn.click();
    return { opened: opened, closed: { open: panel.open,
      aria: btn.getAttribute('aria-expanded') } };
  })()`);
  assert.equal(cycle.opened.open, true);
  assert.equal(cycle.opened.aria, 'true');
  assert.match(cycle.opened.text, /What goes here/);
  // The content is the asset's, not a label the loop invented.
  assert.match(cycle.opened.text, /responsible for/);
  assert.equal(cycle.closed.open, false);
  assert.equal(cycle.closed.aria, 'false');
});

// A document with no kind renders exactly as it does today. The ADR fixture is
// the case the spec excludes by name: §14 is already the home for that guidance.
test('a document with no kind gets no explainer', async () => {
  const count = await page.eval(
    "document.querySelectorAll('.page:not([data-kind]) .help-btn').length");
  assert.equal(count, 0, 'an excluded document grew an explainer');
});

// Subheadings are out of scope, and an h3 that happens to share a spine
// heading's text must not pick one up.
test('subheadings get no explainer', async () => {
  assert.equal(await page.eval("document.querySelectorAll('.doc h3 .help-btn').length"), 0);
});

test('injecting the explainers logs no error', async () => {
  assert.deepEqual(page.errors, []);
});
```

- [ ] **Step 3: Run the test to verify it fails, then passes**

Run: `node --test scripts/test/browser.test.mjs`

If Chrome is absent the whole `describe` skips — a skip is not a pass, so do not treat it as one. Before Task 5's loop is in place these must fail on `no help button in the heading`; confirm that, then re-run after. A test that passes on the first run is asserting nothing — fix the assertion rather than moving on.

- [ ] **Step 4: Document the affordance**

Add a short subsection to `references/viewer.md` describing the explainers: where the content lives (`assets/section-help.json`), what keys it on (heading text, and why not the slug), and which document kinds are in scope. Match the file's existing register — it explains *why* a thing is the way it is, not only what it does.

- [ ] **Step 5: Run the whole suite one last time**

Run: `node --test scripts/test/*.test.mjs`
Expected: compare against the baseline recorded at the start. Only the pre-existing environment-gated failures remain.

- [ ] **Step 6: Commit**

```bash
git add scripts/test/browser.test.mjs references/viewer.md
git commit -m "test(arch-docs): drive explainers in a browser"
```

---

## Notes for the implementer

**Do not** add a hover trigger. It was considered and rejected: the panel text is too long for a tooltip, and the template carries no `@media (hover: hover)` or `pointer: coarse` guard anywhere, so a hover-only control would be unreachable on the touch and keyboard targets the viewer already supports.

**Do not** key the lookup on heading slugs. `slugify` in `scripts/lib/validate-links.mjs:4` strips `&` but keeps both surrounding spaces, and `h2`/`h3` ids share a single dedupe registry across all documents. Both hazards are silent.

**Do not** give ADRs, `CONTEXT.md`, `CONTEXT-MAP.md`, or the interface contract an explainer. Each exclusion has a stated reason in the spec.

**Do not** copy wording from `docs.arc42.org`. The arc42 template is CC BY-SA 4.0; copying it verbatim would attach share-alike obligations to every document set this viewer emits. Write the explanation in our own words instead — and per Task 6, do not link to arc42 either; a reader who wants it can search for it.
