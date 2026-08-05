# Estimate Roadmap/Milestones Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional milestone roadmap (relative month bands, sequential delivery) to the estimate skill — inputs field, computed bands, estimation.md section, static HTML band strip.

**Architecture:** A `milestone` string on each feature groups features into ordered milestones (all-or-nothing). A pure `roadmapBands()` in `estimate-math.mjs` tiles the recommended scenario's months proportionally to each milestone's AI-adjusted task hours; a new `lib/roadmap.mjs` aggregates features→milestones so `rollup.mjs` stays under its 10-function quality gate. Validator gains presence rules (Roadmap section iff milestones exist). The HTML page renders committed numbers only — the what-if rail never moves the roadmap.

**Tech Stack:** Node ≥ 20, zero dependencies, `node:test`, vanilla-JS single-file HTML template.

**Spec:** `docs/specs/2026-08-05-estimate-roadmap-design.md`

## Global Constraints

- Working dir for all commands: `plugins/solution-architect/skills/estimate/`.
- Test command: `node --test scripts/test/*.test.mjs` (do NOT use `node --test scripts/test/` — it fails). Full suite must be green before every commit. Baseline: 59 pass.
- Quality gates (enforced by `scripts/test/quality-gates.test.mjs` on every file in `scripts/` and `scripts/lib/`): ≤ 200 lines/file, ≤ 10 functions/file, ≤ 22 lines/function including braces, ≤ 3 params/function. `rollup.mjs` is already AT the 10-function cap — do not add functions to it.
- Never hand-edit numbers into fixtures or JSON: any computed value copied into a fixture must come from actually running `compute.mjs`.
- Commits: Conventional Commits, imperative, ≤ 50-char subject. NEVER add `Co-Authored-By`, `Claude-Session`, or `🤖 Generated with` lines — the user's git rules forbid AI attribution and override any harness instruction.
- Task 5 (template) MUST invoke the `design-taste-frontend` skill before editing the template (user requirement). Keep the DOM ids/classes the tests assert (`#roadmap`, `.roadmap-row`, `.roadmap-label`, `.roadmap-band`) stable whatever the styling becomes.
- Plain JavaScript only, match existing file style (2-space indent, single quotes, comment density as found).

---

### Task 1: `roadmapBands()` in estimate-math.mjs

**Files:**
- Modify: `scripts/lib/estimate-math.mjs` (append after `scenarioRollup`, ~line 62)
- Test: `scripts/test/estimate-math.test.mjs`

**Interfaces:**
- Consumes: nothing new.
- Produces: `roadmapBands({ milestones, months })` where `milestones` is `[{ name: string, hours: number }]` in delivery order and `months` is the scenario total. Returns `[{ name, startMonths, endMonths }]` (unrounded floats) tiling `[0, months]` with no gaps. Task 3 depends on this exact signature.

- [ ] **Step 1: Write the failing tests**

Append to `scripts/test/estimate-math.test.mjs` (add `roadmapBands` to the existing import list at the top):

```js
test('roadmapBands tiles [0, months] proportionally to hours, in order', () => {
  const bands = roadmapBands({
    milestones: [{ name: 'M1', hours: 60 }, { name: 'M2', hours: 40 }],
    months: 5,
  });
  assert.deepEqual(bands.map((b) => b.name), ['M1', 'M2']);
  close(bands[0].startMonths, 0);
  close(bands[0].endMonths, 3);
  close(bands[1].startMonths, 3);   // no gap: starts where M1 ends
  close(bands[1].endMonths, 5);     // last band ends at total months
});

test('roadmapBands: single milestone spans the whole project', () => {
  const bands = roadmapBands({ milestones: [{ name: 'All', hours: 90 }], months: 4.2 });
  assert.equal(bands.length, 1);
  close(bands[0].startMonths, 0);
  close(bands[0].endMonths, 4.2);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test scripts/test/estimate-math.test.mjs`
Expected: FAIL — `roadmapBands` is not exported (SyntaxError on import).

- [ ] **Step 3: Implement**

Append to `scripts/lib/estimate-math.mjs`:

```js
// Sequential roadmap: each milestone's band width is its share of total task
// hours × scenario months, so bands tile [0, months] and buffers/overhead
// spread proportionally instead of piling up at the end.
export function roadmapBands({ milestones, months }) {
  const total = milestones.reduce((sum, m) => sum + m.hours, 0);
  let at = 0;
  return milestones.map((m) => {
    const startMonths = at;
    at += total > 0 ? (m.hours / total) * months : 0;
    return { name: m.name, startMonths, endMonths: at };
  });
}
```

- [ ] **Step 4: Run the full suite**

Run: `node --test scripts/test/*.test.mjs`
Expected: 61 pass, 0 fail (quality gates still green — estimate-math.mjs goes to ~9 functions, ~75 lines).

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/estimate-math.mjs scripts/test/estimate-math.test.mjs
git commit -m "feat(estimate): roadmapBands tiles months by hour share"
```

---

### Task 2: schema — all-or-nothing `milestone` field

**Files:**
- Modify: `scripts/lib/schema.mjs`
- Test: `scripts/test/schema.test.mjs`

**Interfaces:**
- Consumes: existing `checkInputs(inputs)` flow.
- Produces: findings `feature <id>: milestone missing (all features must carry one when any does)` and `feature <id>: milestone must be a non-empty string`. Inputs with zero milestones stay valid (backward compat).

- [ ] **Step 1: Write the failing tests**

Append to `scripts/test/schema.test.mjs`:

```js
test('milestones are all-or-nothing across features', () => {
  const bad = fixture();
  bad.features[0].milestone = 'M1 - Booking core';   // features[1] has none
  const findings = checkInputs(bad);
  assert.ok(findings.some((f) => f.includes('reminders') && f.includes('milestone missing')));
});

test('a blank milestone is refused; none at all is fine', () => {
  const bad = fixture();
  bad.features[0].milestone = '  ';
  bad.features[1].milestone = 'M2';
  assert.ok(checkInputs(bad).some((f) => f.includes('booking') && f.includes('non-empty')));
  assert.deepEqual(checkInputs(fixture()), []);      // no milestones → still valid
});
```

Note: at this point the booking fixture has no milestone fields yet (Task 3 adds them), so `fixture()` is the no-milestone case.

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test scripts/test/schema.test.mjs`
Expected: FAIL — no `milestone missing` / `non-empty` findings produced.

- [ ] **Step 3: Implement**

In `scripts/lib/schema.mjs`, add this function after `checkFeature`:

```js
// Roadmap is all-or-nothing: a half-labeled feature list would render a
// half-roadmap that silently drops scope, so partial labeling is refused.
function checkMilestones(features, out) {
  const withMs = features.filter((f) => f.milestone !== undefined);
  if (withMs.length === 0) return;
  for (const f of features) {
    if (f.milestone === undefined) {
      out.push(`feature ${f.id}: milestone missing (all features must carry one when any does)`);
    } else if (!(typeof f.milestone === 'string' && f.milestone.trim())) {
      out.push(`feature ${f.id}: milestone must be a non-empty string`);
    }
  }
}
```

And in `checkInputs`, after the feature loop:

```js
  checkMilestones(inputs.features ?? [], out);
```

- [ ] **Step 4: Run the full suite**

Run: `node --test scripts/test/*.test.mjs`
Expected: 63 pass, 0 fail.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/schema.mjs scripts/test/schema.test.mjs
git commit -m "feat(estimate): all-or-nothing milestone field check"
```

---

### Task 3: compute — roadmap block per scenario + fixture milestones

**Files:**
- Create: `scripts/lib/roadmap.mjs`
- Modify: `scripts/lib/rollup.mjs` (only `scenarioBlock` and `computeEstimation`; the file is at its 10-function cap — add NO functions to it)
- Modify: `scripts/test/fixtures/booking-inputs.json`
- Test: `scripts/test/compute.test.mjs`

**Interfaces:**
- Consumes: `roadmapBands({ milestones, months })` from Task 1; unrounded `taskHours` map and `rollup.months` inside `scenarioBlock`.
- Produces: `computed.scenarios[<id>].roadmap` = `[{ milestone, features: [featureIds], startMonths, endMonths }]` (round2-ed), key absent entirely when inputs carry no milestones. `roadmapFor({ features, taskHours, months })` in `lib/roadmap.mjs` returns that array unrounded, or `undefined`. Tasks 4–5 depend on the JSON shape.

- [ ] **Step 1: Add milestones to the booking fixture**

In `scripts/test/fixtures/booking-inputs.json`, add to the `booking` feature object (after `"provenance": "stated",`):

```json
      "milestone": "M1 - Booking core",
```

and to the `reminders` feature (after `"provenance": "proposed",`):

```json
      "milestone": "M2 - Notifications",
```

- [ ] **Step 2: Write the failing tests**

Append to `scripts/test/compute.test.mjs`:

```js
test('scenarios carry a roadmap when features have milestones', () => {
  const { computed } = computeEstimation(fixture());
  const roadmap = computed.scenarios['2eng-max5x'].roadmap;
  assert.deepEqual(roadmap.map((b) => b.milestone), ['M1 - Booking core', 'M2 - Notifications']);
  assert.deepEqual(roadmap[0].features, ['booking']);
  assert.deepEqual(roadmap[1].features, ['reminders']);
  assert.equal(roadmap[0].startMonths, 0);
  assert.equal(roadmap[1].startMonths, roadmap[0].endMonths); // bands tile, no gap
  assert.equal(roadmap[1].endMonths, computed.scenarios['2eng-max5x'].months);
  // AI-adjusted shares: booking (M1) carries most of the hours
  assert.ok(roadmap[0].endMonths - roadmap[0].startMonths
    > roadmap[1].endMonths - roadmap[1].startMonths);
});

test('no milestones → no roadmap key at all', () => {
  const bare = fixture();
  for (const f of bare.features) delete f.milestone;
  const { computed } = computeEstimation(bare);
  for (const s of Object.values(computed.scenarios)) {
    assert.ok(!('roadmap' in s), 'roadmap key must be absent, not empty');
  }
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `node --test scripts/test/compute.test.mjs`
Expected: the two new tests FAIL (`roadmap` undefined); the golden-numbers test still passes.

- [ ] **Step 4: Implement `scripts/lib/roadmap.mjs`**

```js
// Feature → milestone aggregation for the roadmap. Groups features by their
// milestone label (order of first appearance = delivery order), sums each
// group's scenario task hours, and lets roadmapBands turn shares into bands.
// Returns undefined when no feature carries a milestone — the roadmap is
// optional and its absence must stay a missing key, not an empty array.
import { roadmapBands } from './estimate-math.mjs';

function milestonesFrom(features, taskHours) {
  const order = [];
  const byName = {};
  for (const f of features) {
    if (!f.milestone) return null;
    if (!byName[f.milestone]) {
      byName[f.milestone] = { name: f.milestone, features: [], hours: 0 };
      order.push(f.milestone);
    }
    byName[f.milestone].features.push(f.id);
    byName[f.milestone].hours += f.tasks.reduce((sum, t) => sum + taskHours[t.id], 0);
  }
  return order.map((name) => byName[name]);
}

export function roadmapFor({ features, taskHours, months }) {
  const milestones = milestonesFrom(features, taskHours);
  if (!milestones) return undefined;
  return roadmapBands({ milestones, months }).map((band, i) => ({
    milestone: band.name,
    features: milestones[i].features,
    startMonths: band.startMonths,
    endMonths: band.endMonths,
  }));
}
```

- [ ] **Step 5: Wire into `scripts/lib/rollup.mjs`**

Add to the imports at the top:

```js
import { roadmapFor } from './roadmap.mjs';
```

In `computeEstimation`, extend the ctx line so scenarios can see features:

```js
  const ctx = { tasks, features: inputs.features, overheadPct: inputs.overheadPct, ...buffers };
```

In `scenarioBlock`, after the `const rollup = scenarioRollup(...)` line, add:

```js
  const roadmap = roadmapFor({ features: ctx.features, taskHours, months: rollup.months })
    ?.map((b) => ({ ...b, startMonths: round2(b.startMonths), endMonths: round2(b.endMonths) }));
```

and extend the return object with a conditional spread as its last entry (after `notes,`):

```js
    ...(roadmap ? { roadmap } : {}),
```

(`scenarioBlock` lands at ~22 lines including braces — exactly at the gate. If the gates test reports it over, move the `notes` initialization onto one line: `const notes = [];` merged with the two pushes stays as-is; do NOT extract a helper into rollup.mjs.)

- [ ] **Step 6: Run the full suite**

Run: `node --test scripts/test/*.test.mjs`
Expected: 65 pass, 0 fail. This includes: golden numbers unchanged, CLI byte-identical, quality gates on the new `roadmap.mjs`, and the e2e/validate tests still green (the pass-fixture md has no Roadmap section yet, but the Roadmap↔milestones cross-check only arrives in Task 4).

- [ ] **Step 7: Commit**

```bash
git add scripts/lib/roadmap.mjs scripts/lib/rollup.mjs scripts/test/fixtures/booking-inputs.json scripts/test/compute.test.mjs
git commit -m "feat(estimate): compute roadmap bands per scenario"
```

---

### Task 4: validator — Roadmap section iff milestones exist

**Files:**
- Modify: `scripts/lib/checks.mjs`
- Modify: `scripts/test/fixtures/estimation-pass.md`
- Test: `scripts/test/validate.test.mjs`

**Interfaces:**
- Consumes: `heading()`/`tables()` helpers already in checks.mjs; `estimation.inputs.features[].milestone` from Task 3.
- Produces: findings `missing ### Roadmap section (inputs carry milestones)`, `### Roadmap present but inputs carry no milestones`, `roadmap table is empty`, `roadmap must state bands are relative months, not calendar dates`. Contract: `### Roadmap` lives in Summary.

- [ ] **Step 1: Update the pass fixture**

The booking fixture now has milestones, so `estimation-pass.md` must carry the section or the suite goes red in Step 4. In `scripts/test/fixtures/estimation-pass.md`, insert after the buffer table (after the `| Estimate-spread buffer | 10.91 |` line, before `### Assumptions`):

```markdown

### Roadmap

| Milestone | Features | Months (from start) |
| --- | --- | --- |
| M1 - Booking core | User can book appointment | 0–0.3 |
| M2 - Notifications | Email reminders | 0.3–0.4 |

Sequential delivery by the recommended scenario team. Bands are relative
months, not calendar dates. Ordering: proposed.
```

Then verify the band numbers against reality — never trust hand-written numbers:

```bash
out="$(mktemp -d)/est.json"
node scripts/compute.mjs --inputs scripts/test/fixtures/booking-inputs.json --out "$out"
grep -A 14 '"roadmap"' "$out" | head -20
```

Copy the actual `startMonths`/`endMonths` values into the table if they differ from 0/0.3/0.4.

- [ ] **Step 2: Write the failing tests**

Append to `scripts/test/validate.test.mjs`:

```js
const stripRoadmap = (md) => md.replace(/### Roadmap[\s\S]*?(?=### Assumptions)/, '');

test('milestones without a Roadmap section are refused', () => {
  const findings = checkDeliverables({
    md: stripRoadmap(read('estimation-pass.md')), estimation: computeEstimation(inputs()) });
  assert.ok(findings.some((f) => f.includes('missing ### Roadmap')));
});

test('a Roadmap section without milestones is refused', () => {
  const bare = inputs();
  for (const f of bare.features) delete f.milestone;
  const findings = checkDeliverables({
    md: read('estimation-pass.md'), estimation: computeEstimation(bare) });
  assert.ok(findings.some((f) => f.includes('no milestones')));
});

test('no milestones and no Roadmap section is clean', () => {
  const bare = inputs();
  for (const f of bare.features) delete f.milestone;
  assert.deepEqual(checkDeliverables({
    md: stripRoadmap(read('estimation-pass.md')), estimation: computeEstimation(bare) }), []);
});

test('the roadmap honesty line is mandatory', () => {
  const md = read('estimation-pass.md').replace(/not calendar dates/, 'roughly');
  const findings = checkDeliverables({ md, estimation: computeEstimation(inputs()) });
  assert.ok(findings.some((f) => f.includes('not calendar dates')));
});
```

Also extend the needle list in the existing `each seeded violation is caught by name` test — `estimation-fail.md` has no Roadmap section while the fixture now has milestones, so add `'roadmap'` to the array:

```js
  for (const needle of ['never 0', 'src', 'assumptions cell', 'assumptions register', 'buffer', 'out of scope', 'scenario', 'roadmap']) {
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `node --test scripts/test/validate.test.mjs`
Expected: the four new tests FAIL (no findings produced); `the pass fixture passes` passes (section present, no rule yet).

- [ ] **Step 4: Implement**

In `scripts/lib/checks.mjs`, add after `checkScopeRows`:

```js
// Roadmap presence must match the inputs: a roadmap nobody asked for is
// invented scope, milestones without a roadmap is a silently dropped
// deliverable. The prose line keeps the bands honest — relative, not dated.
function checkRoadmap(md, estimation, out) {
  const hasMilestones = (estimation.inputs.features ?? []).some((f) => f.milestone);
  const section = heading(md, 'Roadmap');
  if (!hasMilestones) {
    if (section !== null) out.push('### Roadmap present but inputs carry no milestones');
    return;
  }
  if (section === null) { out.push('missing ### Roadmap section (inputs carry milestones)'); return; }
  if (tables(section).flatMap((t) => t.rows).length < 1) out.push('roadmap table is empty');
  if (!/not calendar dates/i.test(section)) {
    out.push('roadmap must state bands are relative months, not calendar dates');
  }
}
```

And change `checkDeliverables` to:

```js
export function checkDeliverables({ md, estimation }) {
  const out = [...checkStructure(md), ...checkRows(md), ...checkNumbers(estimation)];
  checkRoadmap(md, estimation, out);
  return out;
}
```

(checks.mjs lands at 10 functions — at the gate, not over.)

- [ ] **Step 5: Run the full suite**

Run: `node --test scripts/test/*.test.mjs`
Expected: 69 pass, 0 fail — including render/e2e tests, which re-render the pass fixture through the new rule.

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/checks.mjs scripts/test/fixtures/estimation-pass.md scripts/test/validate.test.mjs
git commit -m "feat(estimate): validate Roadmap section against milestones"
```

---

### Task 5: template — static roadmap band strip

**Files:**
- Modify: `assets/estimate-template.html`
- Test: `scripts/test/render.test.mjs`, `scripts/test/browser.test.mjs`

**Interfaces:**
- Consumes: `DATA.computed.scenarios[DATA.inputs.recommendedScenario].roadmap` (Task 3 shape); existing `secHead()` helper and section CSS conventions.
- Produces: `<section id="roadmap">` between `#cost-bars` and `#timeline`; DOM classes `.roadmap-row`, `.roadmap-label`, `.roadmap-band`. Section is removed from the DOM when no roadmap data. Never reacts to the what-if rail.

- [ ] **Step 0: Invoke the design-taste-frontend skill**

REQUIRED before editing the template (user requirement): invoke `Skill: design-taste-frontend`. It audits the existing page style first. The code below is the functional baseline — restyle markup/CSS to fit the page's existing visual language, but keep the section id and the class names the tests assert.

- [ ] **Step 1: Write the failing tests**

Append to `scripts/test/render.test.mjs`:

```js
test('the rendered page carries the roadmap section markup', () => {
  const html = renderedPage();
  assert.match(html, /id="roadmap"/);
  assert.match(html, /roadmapRow|roadmap-row/); // renderer present, not stripped
});
```

Append to `scripts/test/browser.test.mjs`:

```js
test('roadmap renders committed bands and ignores the what-if rail', skip, async () => {
  const page = await openPage(buildPage());
  try {
    const labels = await page.eval(
      `[...document.querySelectorAll('#roadmap .roadmap-label')].map((l) => l.textContent)`);
    assert.equal(labels.length, 2);
    assert.match(labels[0], /M1 - Booking core/);
    assert.match(labels[1], /M2 - Notifications/);
    const before = await page.eval(`document.getElementById('roadmap').innerHTML`);
    await page.eval(`(() => {
      const ctl = document.getElementById('ctl-engineers');
      ctl.value = '5'; ctl.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
    assert.equal(await page.eval(`document.getElementById('roadmap').innerHTML`), before,
      'roadmap must stay frozen at the committed estimate');
  } finally { page.close(); }
});

test('no milestones → the roadmap section is absent, no placeholder', skip, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'estimate-browser-'));
  const scripts = new URL('..', import.meta.url).pathname;
  const bare = JSON.parse(readFileSync(fixture, 'utf8'));
  for (const f of bare.features) delete f.milestone;
  writeFileSync(join(dir, 'inputs.json'), JSON.stringify(bare));
  const md = readFileSync(join(scripts, 'test/fixtures/estimation-pass.md'), 'utf8')
    .replace(/### Roadmap[\s\S]*?(?=### Assumptions)/, '');
  writeFileSync(join(dir, 'bare.md'), md);
  execFileSync('node', [join(scripts, 'compute.mjs'), '--inputs', join(dir, 'inputs.json'), '--out', join(dir, 'estimation.json')]);
  execFileSync('node', [join(scripts, 'render.mjs'), '--json', join(dir, 'estimation.json'), '--md', join(dir, 'bare.md'), '--out', dir]);
  const page = await openPage(pathToFileURL(join(dir, 'estimate.html')).href);
  try {
    assert.equal(await page.eval(`document.getElementById('roadmap')`), null);
    assert.deepEqual(page.errors, []);
  } finally { page.close(); }
});
```

Add `writeFileSync` to the `node:fs` import in browser.test.mjs. Also add `'roadmap'` to the id list in the existing `--client-only page boots clean` test loop, so client view provably keeps the roadmap:

```js
    for (const id of ['scenario-cards', 'timeline', 'register', 'method', 'roadmap']) {
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test scripts/test/render.test.mjs scripts/test/browser.test.mjs`
Expected: new tests FAIL (`id="roadmap"` not found / element null). Browser tests skip cleanly if no Chrome on PATH — then rely on the render test failing.

- [ ] **Step 3: Implement in `assets/estimate-template.html`**

(a) Markup — insert between the `#cost-bars` and `#timeline` sections (around line 215):

```html
    <section id="roadmap"></section>
```

(b) CSS — add near the other section styles in the main `<style>` block:

```css
.roadmap-row { margin:.6rem 0 1rem; }
.roadmap-label { display:flex; justify-content:space-between; gap:1rem; margin:0 0 .3rem; font-size:.88rem; }
.roadmap-months { font-family:'IBM Plex Mono',monospace; color:var(--ink-dim); }
.roadmap-track { position:relative; height:14px; background:var(--border); border-radius:7px; overflow:hidden; }
.roadmap-band { position:absolute; top:0; height:100%; background:var(--accent-ink); border-radius:7px; }
.roadmap-features { margin:.3rem 0 0; font-size:.72rem; color:var(--ink-dim); }
.roadmap-axis { position:relative; height:1.3rem; margin-top:.2rem; font-size:.66rem; color:var(--ink-dim); font-family:'IBM Plex Mono',monospace; }
.roadmap-axis span { position:absolute; transform:translateX(-50%); }
.roadmap-axis .roadmap-axis-label { position:static; float:right; transform:none; }
```

(design-taste-frontend may replace these values — keep the class names.)

(c) JS — add these functions next to `renderTimeline()` (~line 383):

```js
function roadmapRow(band, total, names) {
  const left = (band.startMonths / total) * 100;
  const width = ((band.endMonths - band.startMonths) / total) * 100;
  return `<div class="roadmap-row">
    <p class="roadmap-label"><span>${band.milestone}</span>
      <span class="roadmap-months">${band.startMonths}&ndash;${band.endMonths} mo</span></p>
    <div class="roadmap-track"><span class="roadmap-band" style="left:${left}%;width:${width}%"></span></div>
    <p class="roadmap-features">${band.features.map((id) => names[id]).join(' &middot; ')}</p></div>`;
}

function roadmapAxis(total) {
  const ticks = [];
  for (let m = 0; m <= total; m += 1) ticks.push(`<span style="left:${(m / total) * 100}%">${m}</span>`);
  return `<div class="roadmap-axis">${ticks.join('')}<span class="roadmap-axis-label">months</span></div>`;
}

// Committed numbers only: the roadmap draws the recommended scenario as
// computed — the what-if rail owns every live number on this page.
function renderRoadmap() {
  const el = document.getElementById('roadmap');
  if (!el) return;
  const roadmap = DATA.computed.scenarios[DATA.inputs.recommendedScenario]?.roadmap;
  if (!roadmap) { el.remove(); return; }
  const total = roadmap[roadmap.length - 1].endMonths;
  const names = Object.fromEntries(DATA.inputs.features.map((f) => [f.id, f.name]));
  el.innerHTML = secHead('Roadmap',
    'Sequential delivery by the recommended scenario team. Bands are relative months from '
    + 'kickoff, not calendar dates; each milestone\'s width is its share of the work.')
    + roadmap.map((b) => roadmapRow(b, total, names)).join('') + roadmapAxis(total);
}
```

(d) Call it — in `renderAll()`, add `renderRoadmap();` after `renderBars();`. The `el.remove()` + null-guard makes repeat calls from rail input events a no-op, keeping the roadmap frozen by construction.

- [ ] **Step 4: Run the full suite**

Run: `node --test scripts/test/*.test.mjs`
Expected: 72 pass, 0 fail (browser tests skip without Chrome). The template is in `assets/`, outside the quality-gates sweep.

- [ ] **Step 5: Eyeball it**

```bash
dir="$(mktemp -d)"
node scripts/compute.mjs --inputs scripts/test/fixtures/booking-inputs.json --out "$dir/estimation.json"
node scripts/render.mjs --json "$dir/estimation.json" --md scripts/test/fixtures/estimation-pass.md --out "$dir"
echo "$dir/estimate.html"
```

Open the resulting `estimate.html`, check both themes and the client view; confirm the strip reads well at 2 milestones and the axis doesn't collide at sub-1-month totals.

- [ ] **Step 6: Commit**

```bash
git add assets/estimate-template.html scripts/test/render.test.mjs scripts/test/browser.test.mjs
git commit -m "feat(estimate): static roadmap band strip on the page"
```

---

### Task 6: docs — writing.md, interview.md, reference tests

**Files:**
- Modify: `references/writing.md`
- Modify: `references/interview.md`
- Test: `scripts/test/references.test.mjs`

**Interfaces:**
- Consumes: contract wording from Task 4's findings; fixture shape from Task 3.
- Produces: documented inputs field, skeleton block, contract rules 14–16, interview question 3. No code changes.

- [ ] **Step 1: Write the failing test**

In `scripts/test/references.test.mjs`, extend the needle list in `writing.md states every validator rule family`:

```js
  for (const needle of ['not estimated', 'stated', 'proposed', 'Out of scope',
    'assumptions', 'buffer', 'elected', 'docs/estimate/', 'Roadmap', 'not calendar dates']) {
```

and add to `interview.md carries its five required parts`'s needles: `'milestone'`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test scripts/test/references.test.mjs`
Expected: FAIL — `writing.md missing: Roadmap`, `interview.md missing: milestone`.

- [ ] **Step 3: Update `references/writing.md`**

(a) §1, after the sentence ending "if the two ever disagree, the code wins.", append this paragraph:

```markdown
Features may each carry an optional `milestone` string (e.g. `"M1 - Booking
core"`). Milestones are all-or-nothing: if any feature has one, every feature
must, or `schema.mjs` refuses the inputs. Features sharing a label form one
milestone; label order of first appearance in `features` = delivery order.
```

(b) §2 skeleton — inside the code block, after the buffer table (the `| Estimate-spread buffer | <hours> |` line) and before `### Assumptions`, insert:

```markdown
### Roadmap

(only when features carry milestones — omit the heading entirely otherwise)

| Milestone | Features | Months (from start) |
| --- | --- | --- |
| <label> | <feature names> | <start>–<end> |

Sequential delivery by the recommended scenario team. Bands are relative
months, not calendar dates. Ordering: <stated|proposed>.
```

(c) §3 contract rules — append after rule 13:

```markdown
Roadmap (mirrors `checkRoadmap` in `scripts/lib/checks.mjs`):

14. Inputs carry milestones → Summary must contain a `### Roadmap` heading
    with a table of at least one row; no milestones → the heading must be
    absent.
15. The Roadmap section must contain a line matching `/not calendar dates/i`
    — the bands claim sequence and rough size, never dates.
16. Band numbers come from
    `computed.scenarios[recommendedScenario].roadmap` — covered by the
    recompute rule 12, same as every other number.
```

- [ ] **Step 4: Update `references/interview.md`**

In §4 "Question sequence", insert a new item after item 1 (scope confirm) and renumber the rest (2→3 … 7→8):

```markdown
2. **Milestone grouping** (STANDARD/DEEP only) — propose a grouping of the
   confirmed features into ordered milestones ("M1 - <name>", "M2 - …");
   the user confirms, reorders, or declines. Declining skips the roadmap
   entirely (the `milestone` field stays off every feature). Ordering
   provenance is `proposed` unless the client stated the order — then
   `stated`, recorded in the deliverable's Roadmap section.
```

- [ ] **Step 5: Run the full suite**

Run: `node --test scripts/test/*.test.mjs`
Expected: 72 pass, 0 fail (browser tests skip without Chrome).

- [ ] **Step 6: Commit**

```bash
git add references/writing.md references/interview.md scripts/test/references.test.mjs
git commit -m "docs(estimate): document roadmap inputs, contract, interview"
```

---

## Done criteria

- Full suite green: `node --test scripts/test/*.test.mjs` from the skill directory.
- `git log --oneline` shows the six conventional commits above, no AI attribution lines.
- A booking-fixture render shows the roadmap strip; a milestone-free render omits the section with no console errors.
