# Component→Task Traceability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect C4 containers/components to features in the estimate skill — a `components` roster with coverage validation that blocks compute, component filter pills and a per-container effort rollup in estimate.html, and a vertical-slice checklist reference.

**Architecture:** A top-level `components` roster in `estimation-inputs.json` (two levels max: container → component), a per-feature `component` tag, both all-or-nothing exactly like the existing `milestone` field. Validation lives in `schema.mjs` (blocks compute); the per-container hours rollup lives in a new `components.mjs` beside `roadmap.mjs` (same optional-key pattern); the UI reuses the existing pill-filter machinery in the template. No changes to arch-docs, `checks.mjs`, or `redact.mjs`.

**Tech Stack:** Node ≥ 20, dependency-free scripts, `node:test` + `node:assert/strict`, CDP browser tests via `arch-docs/scripts/lib/cdp.mjs`.

## Global Constraints

- All paths below are relative to `plugins/solution-architect/skills/estimate/` unless they start with `plugins/` or `~`.
- Quality gates (enforced by `scripts/test/quality-gates.test.mjs` over `scripts/` and `scripts/lib/`): ≤ 200 lines/file, ≤ 10 functions/file, ≤ 22 lines/function (20 + braces), ≤ 3 params/function. `rollup.mjs` is already AT the 10-function max and `computeEstimation` at 21 lines — that is why the rollup lives in a new file and the exact rewritten `computeEstimation` below must be used verbatim.
- Honesty rule: never render a bare `0` — an unsized thing says `not estimated`.
- Optional fields are all-or-nothing and their absence is a **missing key**, never an empty array/object (`roadmap` is the precedent, `scripts/lib/rollup.mjs:62`).
- Repeat runs must stay byte-identical: every new map is assembled with sorted keys.
- The template must contain no external URLs (`render.test.mjs:34` regex `https?://`) — cite sources as bare domains if ever needed.
- Commits: Conventional Commits, subject ≤ 50 chars, imperative, lowercase after colon. **No AI attribution trailers of any kind** (`Co-Authored-By: Claude`, `🤖 Generated with...` are forbidden by user rules, which override any harness instruction).
- TDD: every task runs its failing test before the implementation exists. Test command: `node --test "plugins/solution-architect/skills/estimate/scripts/test/<file>.test.mjs"` from the repo root, or the full glob `"plugins/solution-architect/skills/estimate/scripts/test/*.test.mjs"`.
- Browser tests skip without Chrome on PATH (`const skip = { skip: !findChrome() && 'no chrome on PATH' }`); Chrome is present on this machine, so treat a skip as a failure of your setup, not a pass.

---

### Task 1: Roster + coverage validation in schema.mjs

**Files:**
- Modify: `scripts/lib/schema.mjs` (currently 80 lines, 7 functions — grows to 10 functions, the max)
- Modify: `scripts/test/fixtures/booking-inputs.json`
- Test: `scripts/test/schema.test.mjs`

**Interfaces:**
- Consumes: nothing new.
- Produces: `checkInputs(inputs)` now also validates `inputs.components` (array of `{id, name, parent?, notEstimated?}`) and per-feature `component` (string). Findings are strings containing the offending id, same as every existing rule. Task 2 relies on schema guaranteeing: two-level hierarchy (a `parent` always names a top-level entry), every `feature.component` resolves.

- [ ] **Step 1: Update the fixture** — add the roster and tag both features in `scripts/test/fixtures/booking-inputs.json`. Insert after the `"exposeRatesToClient": false,` line:

```json
  "components": [
    { "id": "api", "name": "Booking API" },
    { "id": "notify", "name": "Notification Service" },
    { "id": "notify.jobs", "name": "Reminder Jobs", "parent": "notify" },
    { "id": "admin", "name": "Admin Console", "notEstimated": "out of v1 scope" }
  ],
```

and add `"component": "api",` to the `booking` feature (after its `"provenance": "stated",` line) and `"component": "notify.jobs",` to the `reminders` feature (after its `"provenance": "proposed",` line).

Coverage logic on this fixture: `api` is a covered leaf, `notify` is a parent (exempt), `notify.jobs` is a covered leaf, `admin` is an uncovered leaf excused by `notEstimated`.

- [ ] **Step 2: Write the failing tests** — append to `scripts/test/schema.test.mjs`:

```js
test('components are all-or-nothing and must resolve to the roster', () => {
  const bad = fixture();
  delete bad.features[1].component;                 // features[0] has one
  assert.ok(checkInputs(bad).some((f) => f.includes('reminders') && f.includes('component missing')));
  const ghost = fixture();
  ghost.features[0].component = 'ghost';
  assert.ok(checkInputs(ghost).some((f) => f.includes('booking') && f.includes('not in roster')));
  const tagOnly = fixture();
  delete tagOnly.components;
  assert.ok(checkInputs(tagOnly).some((f) => f.includes('no top-level components roster')));
  const bare = fixture();
  delete bare.components;
  for (const f of bare.features) delete f.component;
  assert.deepEqual(checkInputs(bare), []);          // no roster at all → still valid
});

test('an uncovered leaf component is a scope hole unless notEstimated says why', () => {
  const bad = fixture();
  bad.components.push({ id: 'reports', name: 'Reporting' });
  assert.ok(checkInputs(bad).some((f) => f.includes('reports') && f.includes('no feature covers it')));
  const excused = fixture();
  excused.components.push({ id: 'reports', name: 'Reporting', notEstimated: 'phase 2' });
  assert.deepEqual(checkInputs(excused), []);
  const blank = fixture();
  blank.components[3].notEstimated = '  ';          // admin's excuse blanked
  assert.ok(checkInputs(blank).some((f) => f.includes('admin') && f.includes('reason')));
});

test('the roster is two levels max and parents must exist', () => {
  const deep = fixture();
  deep.components.push({ id: 'retry', name: 'Retry', parent: 'notify.jobs' });
  assert.ok(checkInputs(deep).some((f) => f.includes('retry') && f.includes('two levels max')));
  const orphan = fixture();
  orphan.components[2].parent = 'ghost';            // notify.jobs → nonexistent parent
  assert.ok(checkInputs(orphan).some((f) => f.includes('notify.jobs') && f.includes('not in roster')));
});
```

- [ ] **Step 3: Run tests to verify the new ones fail and the old ones still pass**

Run: `node --test "plugins/solution-architect/skills/estimate/scripts/test/schema.test.mjs"`
Expected: the 3 new tests FAIL (findings arrays are empty — no rule exists yet); `the booking fixture is valid` and `every defect is named with its path` (asserts exactly 5 findings) still PASS, proving the fixture change alone breaks nothing.

- [ ] **Step 4: Implement** — in `scripts/lib/schema.mjs`, insert after `checkMilestones` (line 44):

```js
// Components are all-or-nothing like milestones, and coverage is the point:
// a §6 component nobody planned work for is a scope hole, refused here unless
// the roster excuses it with an explicit notEstimated reason. Two levels max —
// C4 container → component — so rollups never walk a chain.
function checkRoster(components, out) {
  const byId = new Map(components.map((c) => [c.id, c]));
  if (byId.size !== components.length) out.push('component roster: duplicate ids');
  for (const c of components) {
    if (!(typeof c.id === 'string' && c.id.trim())) out.push('component roster: every entry needs a non-empty id');
    if (!(typeof c.name === 'string' && c.name.trim())) out.push(`component ${c.id}: name must be a non-empty string`);
    if (c.notEstimated !== undefined && !(typeof c.notEstimated === 'string' && c.notEstimated.trim())) {
      out.push(`component ${c.id}: notEstimated must carry a reason`);
    }
    if (c.parent === undefined) continue;
    const parent = byId.get(c.parent);
    if (!parent) out.push(`component ${c.id}: parent "${c.parent}" not in roster`);
    else if (parent.parent !== undefined) out.push(`component ${c.id}: parent "${c.parent}" is not top-level (two levels max)`);
  }
}

function checkComponentCoverage(components, features, out) {
  const covered = new Set(features.map((f) => f.component));
  const parents = new Set(components.map((c) => c.parent).filter(Boolean));
  for (const c of components) {
    if (!parents.has(c.id) && !covered.has(c.id) && c.notEstimated === undefined) {
      out.push(`component ${c.id}: no feature covers it — tag a feature or set notEstimated with a reason`);
    }
  }
}

function checkComponents(inputs, out) {
  const features = inputs.features ?? [];
  if (inputs.components === undefined) {
    for (const f of features) {
      if (f.component !== undefined) out.push(`feature ${f.id}: component set but no top-level components roster`);
    }
    return;
  }
  checkRoster(inputs.components, out);
  const ids = new Set(inputs.components.map((c) => c.id));
  for (const f of features) {
    if (f.component === undefined) out.push(`feature ${f.id}: component missing (all features must carry one when a roster exists)`);
    else if (!ids.has(f.component)) out.push(`feature ${f.id}: component "${f.component}" not in roster`);
  }
  checkComponentCoverage(inputs.components, features, out);
}
```

and wire it into `checkInputs` by adding one line after `checkMilestones(inputs.features ?? [], out);`:

```js
  checkComponents(inputs, out);
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `node --test "plugins/solution-architect/skills/estimate/scripts/test/schema.test.mjs"` — all PASS.
Then run `node --test "plugins/solution-architect/skills/estimate/scripts/test/quality-gates.test.mjs"` — schema.mjs is now at exactly 10 functions; must still PASS.
Then the full suite — `compute.test.mjs`'s `inputs echoed verbatim` self-updates via `fixture()`, so everything stays green.

- [ ] **Step 6: Commit**

```bash
git add plugins/solution-architect/skills/estimate/scripts/lib/schema.mjs plugins/solution-architect/skills/estimate/scripts/test/schema.test.mjs plugins/solution-architect/skills/estimate/scripts/test/fixtures/booking-inputs.json
git commit -m "feat(estimate): component roster with coverage validation"
```

---

### Task 2: Per-container hours rollup in computed output

**Files:**
- Create: `scripts/lib/components.mjs`
- Modify: `scripts/lib/rollup.mjs` (`computeEstimation`, lines 115-135)
- Test: `scripts/test/compute.test.mjs`

**Interfaces:**
- Consumes: schema guarantees from Task 1 (two-level roster, resolving tags).
- Produces: `componentHoursFor(inputs, featureHours) → {<containerId>: hours} | undefined`, where `featureHours` is the `computed.features` map (`{<featureId>: {hours, low, high}}`). `computeEstimation` output gains `computed.components` (sorted keys, round2 values, key absent when no roster). Tasks 3-4 read `DATA.computed.components` and `DATA.inputs.components` in the page.

- [ ] **Step 1: Write the failing tests** — append to `scripts/test/compute.test.mjs`:

```js
test('computed.components rolls feature hours into top-level containers', () => {
  const { computed } = computeEstimation(fixture());
  // booking (api) 69.33 · reminders (notify.jobs → notify) 21.33 · admin excused, 0
  assert.deepEqual(computed.components, { admin: 0, api: 69.33, notify: 21.33 });
});

test('no roster → no components key at all', () => {
  const bare = fixture();
  delete bare.components;
  for (const f of bare.features) delete f.component;
  const { computed } = computeEstimation(bare);
  assert.ok(!('components' in computed), 'components key must be absent, not empty');
});
```

- [ ] **Step 2: Run to verify both fail**

Run: `node --test "plugins/solution-architect/skills/estimate/scripts/test/compute.test.mjs"`
Expected: first new test FAILS (`computed.components` is `undefined`); second PASSES trivially today — that is fine, it exists to pin the behavior once the key is introduced.

- [ ] **Step 3: Create `scripts/lib/components.mjs`**

```js
// Feature → container aggregation for the effort-by-container rollup. Sums
// each feature's expected hours into its component's top-level ancestor
// (two levels max, enforced by schema.mjs, so the ancestor is one parent hop).
// Returns undefined when inputs carry no roster — like the roadmap, absence
// must stay a missing key, not an empty map. Sums the displayed (rounded)
// per-feature hours so this table always agrees with the breakdown table.
export function componentHoursFor(inputs, featureHours) {
  if (!inputs.components) return undefined;
  const round2 = (n) => Math.round(n * 100) / 100;
  const parentOf = Object.fromEntries(inputs.components.map((c) => [c.id, c.parent]));
  const hours = {};
  for (const c of inputs.components) if (!c.parent) hours[c.id] = 0;
  for (const f of inputs.features) {
    hours[parentOf[f.component] ?? f.component] += featureHours[f.id].hours;
  }
  return Object.fromEntries(Object.entries(hours)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, h]) => [id, round2(h)]));
}
```

- [ ] **Step 4: Wire into `rollup.mjs`** — add the import next to the `roadmapFor` import:

```js
import { componentHoursFor } from './components.mjs';
```

then replace `computeEstimation` (lines 115-135) with EXACTLY this — the `roundedTasks` variable is inlined to buy the line the `components` const costs, keeping the function at the 22-line gate:

```js
export function computeEstimation(inputs) {
  const tasks = buildTasks(inputs);
  const { features, summaries } = buildFeatures(inputs, tasks);
  const buffers = globalBuffers(tasks, inputs.risks);
  const ctx = { tasks, features: inputs.features, overheadPct: inputs.overheadPct, ...buffers };
  const scenarios = sortedMap(inputs.scenarios.map((s) => [s.id, scenarioBlock(s, ctx)]));
  const components = componentHoursFor(inputs, features);
  return {
    inputs,
    computed: {
      tasks: sortedMap(Object.entries(tasks).map(([id, t]) => [id, { e: round2(t.e), sigma: round2(t.sigma) }])),
      features,
      ...(components ? { components } : {}),
      devHours: round2(buffers.devHours),
      overheadHours: round2(buffers.devHours * inputs.overheadPct),
      spreadBufferHours: round2(buffers.spreadBufferHours),
      riskBufferHours: round2(buffers.riskBufferHours),
      scenarios,
      projectConfidence: criticalConfidence(summaries, tasks),
    },
  };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `node --test "plugins/solution-architect/skills/estimate/scripts/test/compute.test.mjs"` — all PASS, including the untouched golden-numbers test and byte-identical-repeat test.
Run: `node --test "plugins/solution-architect/skills/estimate/scripts/test/quality-gates.test.mjs"` — the new file and the rewritten function must both pass the gates.

- [ ] **Step 6: Commit**

```bash
git add plugins/solution-architect/skills/estimate/scripts/lib/components.mjs plugins/solution-architect/skills/estimate/scripts/lib/rollup.mjs plugins/solution-architect/skills/estimate/scripts/test/compute.test.mjs
git commit -m "feat(estimate): per-container hours rollup in computed output"
```

---

### Task 3: Component filter pills in the breakdown

**Files:**
- Modify: `assets/estimate-template.html` (breakdown block, lines 548-689)
- Test: `scripts/test/browser.test.mjs`

**Interfaces:**
- Consumes: `DATA.inputs.components` (roster), `feature.component` tags — both present in the embedded data island already (inputs are echoed verbatim).
- Produces: `containerOf(id)` helper and `bdState.component` filter state, reused by Task 4's section only via shared roster data (no code dependency).

- [ ] **Step 1: Write the failing test** — append to `scripts/test/browser.test.mjs`:

```js
test('component pills filter rows by container', skip, async () => {
  const page = await openPage(buildPage());
  try {
    // pills name containers from the roster — never leaf components, never admin (no rows)
    const pills = await page.eval(
      `[...document.querySelectorAll('#feature-table button[data-component]')].map((b) => b.textContent)`);
    assert.deepEqual(pills, ['all components', 'Booking API', 'Notification Service']);
    await page.eval(`document.querySelector('#feature-table button[data-component="notify"]').click()`);
    assert.deepEqual(await page.eval(
      `[...document.querySelectorAll('#feature-table tr.feat-row')].map((r) => r.dataset.id)`), ['reminders']);
    await page.eval(`document.querySelector('#feature-table button[data-component=""]').click()`);
    assert.equal(await page.eval(`document.querySelectorAll('#feature-table tr.feat-row').length`), 2);
    assert.deepEqual(page.errors, []);
  } finally { page.close(); }
});
```

- [ ] **Step 2: Run it, verify FAIL** — `node --test "plugins/solution-architect/skills/estimate/scripts/test/browser.test.mjs"` — the new test fails on the pills `deepEqual` (empty list); every existing test still passes.

- [ ] **Step 3: Implement in `assets/estimate-template.html`** — five surgical edits:

(a) Immediately before the `const bdState = ...` line (554), insert:

```js
// Two levels max (schema-enforced), so a component's container is one parent
// hop at most; a top-level id is its own container.
const COMP_PARENT = Object.fromEntries((DATA.inputs.components ?? []).map((c) => [c.id, c.parent]));
const containerOf = (id) => COMP_PARENT[id] ?? id;
```

(b) Extend `bdState` (554) with the filter slot:

```js
const bdState = { sortKey: 'hours', dir: -1, milestone: '', component: '', prov: '', expanded: new Set() };
```

(c) In `breakdownData()` (564-572), add `component: f.component,` to the returned object, after `milestone: f.milestone,`.

(d) Replace `bdVisible` (582-585) with:

```js
function bdVisible(list) {
  return list.filter((f) => (!bdState.milestone || f.milestone === bdState.milestone)
    && (!bdState.component || containerOf(f.component) === bdState.component)
    && (!bdState.prov || f.provenance === bdState.prov));
}
```

(e) In `bdFilters(all)` (598-608), insert after the `milestones` block and before `const source = ...`:

```js
  let components = '';
  if (DATA.inputs.components) {
    const names = Object.fromEntries(DATA.inputs.components.map((c) => [c.id, c.name]));
    const tops = [...new Set(all.map((f) => containerOf(f.component)))];
    components = pillGroup({ name: 'component', attr: 'data-component', current: bdState.component,
      pairs: [['', 'all components'], ...tops.map((id) => [id, names[id] ?? id])] });
  }
```

and change the return line to include the group:

```js
  return `<div class="bd-filters">${milestones}${components}<span class="bd-right">${bdExpandControls()}${source}</span></div>`;
```

(f) In `onBreakdownClick` (681-689), add one clause after the `data-milestone` line:

```js
  else if (btn.dataset.component !== undefined) { bdState.component = btn.dataset.component; renderBreakdown(); }
```

- [ ] **Step 4: Run the browser suite, verify PASS** — same command; also confirm `milestone and provenance filters scope rows without rescaling bars` still passes (the new pill group must not disturb existing selectors).

- [ ] **Step 5: Commit**

```bash
git add plugins/solution-architect/skills/estimate/assets/estimate-template.html plugins/solution-architect/skills/estimate/scripts/test/browser.test.mjs
git commit -m "feat(estimate): component filter pills in the breakdown"
```

---

### Task 4: Effort-by-container section

**Files:**
- Modify: `assets/estimate-template.html` (sections div line 391-395, CSS near line 256, renderer after `renderRoadmap` ~line 761, `renderAll` line 826-834)
- Test: `scripts/test/browser.test.mjs`, `scripts/test/render.test.mjs`

**Interfaces:**
- Consumes: `DATA.computed.components` from Task 2, `esc()` (template line 710), `secHead()` (line 484), existing `.bd-track`/`.bd-fill` bar styles.
- Produces: `<section id="containers">` — client-visible (not internal), absent when no roster.

- [ ] **Step 1: Write the failing tests.** Append to `scripts/test/browser.test.mjs`:

```js
test('the effort-by-container rollup shows hours, shares, and honest gaps', skip, async () => {
  const page = await openPage(buildPage());
  try {
    const rows = await page.eval(`[...document.querySelectorAll('#containers tbody tr')].map((r) =>
      [...r.querySelectorAll('td')].slice(0, 3).map((c) => c.textContent.trim()))`);
    // hours desc; admin is roster-excused → the honest words, never a bare 0
    assert.deepEqual(rows, [
      ['Booking API', '69.33h', '76%'],
      ['Notification Service', '21.33h', '24%'],
      ['Admin Console', 'not estimated', ''],
    ]);
    assert.deepEqual(page.errors, []);
  } finally { page.close(); }
});

test('no roster → the containers section is absent, no placeholder', skip, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'estimate-browser-'));
  const scripts = new URL('..', import.meta.url).pathname;
  const bare = JSON.parse(readFileSync(fixture, 'utf8'));
  delete bare.components;
  for (const f of bare.features) delete f.component;
  writeFileSync(join(dir, 'inputs.json'), JSON.stringify(bare));
  execFileSync('node', [join(scripts, 'compute.mjs'), '--inputs', join(dir, 'inputs.json'), '--out', join(dir, 'estimation.json')]);
  execFileSync('node', [join(scripts, 'render.mjs'), '--json', join(dir, 'estimation.json'), '--md', join(scripts, 'test/fixtures/estimation-pass.md'), '--out', dir]);
  const page = await openPage(pathToFileURL(join(dir, 'estimate.html')).href);
  try {
    assert.equal(await page.eval(`document.getElementById('containers')`), null);
    assert.deepEqual(page.errors, []);
  } finally { page.close(); }
});
```

Also extend the id list in the existing `the --client-only page boots clean without its stripped controls` test (line 120) to include the new section:

```js
    for (const id of ['scenario-cards', 'feature-table', 'register', 'method', 'roadmap', 'containers']) {
```

And append to `scripts/test/render.test.mjs` (component names are architecture facts the client already sees — they must survive redaction):

```js
test('component data survives the client-only render', () => {
  const client = renderedPage(['--client-only']);
  assert.match(client, /"components":/);
  assert.match(client, /"component":"api"/);
});
```

- [ ] **Step 2: Run both suites, verify the new tests FAIL** — the render test actually PASSES already (redact.mjs is a targeted strip, inputs pass through); keep it as a pin. The two browser tests and the extended id-list assertion FAIL (`#containers` missing).

- [ ] **Step 3: Implement in `assets/estimate-template.html`** — four edits:

(a) Sections div (391-395) — insert the section between roadmap and feature-table:

```html
  <div class="col col-wide">
    <section id="roadmap"></section>
    <section id="containers"></section>
    <section id="feature-table"></section>
    <section id="register"></section>
  </div>
```

(b) CSS — after the `.bd-filters { ... }` rule (line 256), add:

```css
#containers .ct-bar { width:38%; }
#containers .bd-track { display:block; }
```

(c) Renderer — insert after the `renderRoadmap()` function (after line 761):

```js
// Committed numbers only, like every section: expected hours summed per
// top-level container (computed.components). A container the roster excused
// with notEstimated renders the honest words, never a bare 0.
function containerRow(id, h, ctx) {
  const share = ctx.total ? Math.round((h / ctx.total) * 100) : 0;
  return `<tr><td>${esc(ctx.names[id] ?? id)}</td>
    <td class="num">${h ? `${h}h` : 'not estimated'}</td><td class="num">${h ? `${share}%` : ''}</td>
    <td class="ct-bar"><span class="bd-track"><span class="bd-fill" style="width:${share}%"></span></span></td></tr>`;
}

function renderContainers() {
  const el = document.getElementById('containers');
  if (!el) return;
  const comp = DATA.computed.components;
  if (!comp) { el.remove(); return; }
  const names = Object.fromEntries(DATA.inputs.components.map((c) => [c.id, c.name]));
  const total = Object.values(comp).reduce((a, b) => a + b, 0);
  const rows = Object.entries(comp).sort(([, a], [, b]) => b - a)
    .map(([id, h]) => containerRow(id, h, { names, total })).join('');
  el.innerHTML = secHead('Effort by container',
    'Expected hours summed per top-level container, from the same task numbers as the '
    + 'breakdown. A container marked "not estimated" is in the architecture but has no '
    + 'sized work yet — an honest gap, not zero effort.')
    + `<div class="bd-scroll"><table>
      <thead><tr><th>Container</th><th class="num">Hours</th><th class="num">Share</th><th></th></tr></thead>
      <tbody>${rows}</tbody></table></div>`;
}
```

(d) `renderAll` (826-834) — add `renderContainers();` on the line after `renderRoadmap();`.

- [ ] **Step 4: Run both suites, verify PASS.** Watch two regressions specifically: `the what-if rail is not sticky and lower sections span the full width` (the new section sits in `col-wide` — must span like its siblings) and `no milestones → the roadmap section is absent` (unrelated but shares the section-removal pattern).

- [ ] **Step 5: Commit**

```bash
git add plugins/solution-architect/skills/estimate/assets/estimate-template.html plugins/solution-architect/skills/estimate/scripts/test/browser.test.mjs plugins/solution-architect/skills/estimate/scripts/test/render.test.mjs
git commit -m "feat(estimate): effort-by-container section on the page"
```

---

### Task 5: references/slicing.md — vertical-slice checklist

**Files:**
- Create: `references/slicing.md`
- Test: `scripts/test/references.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: the reference file Task 6's SKILL.md edit points at.

- [ ] **Step 1: Write the failing test** — in `scripts/test/references.test.mjs`, add `'slicing.md'` to the `ALL` array (line 7) and append:

```js
test('slicing.md carries the vertical-slice rules and split patterns', () => {
  const doc = ref('slicing.md');
  for (const needle of ['walking skeleton', 'user-visible', 'Workflow steps', 'Spike',
    'two levels', 'humanizingwork.com', 'addyosmani']) {
    assert.ok(doc.includes(needle), `slicing.md missing: ${needle}`);
  }
  assert.ok(/## Sources/.test(doc), 'slicing.md missing Sources section');
});
```

- [ ] **Step 2: Run, verify FAIL** — `node --test "plugins/solution-architect/skills/estimate/scripts/test/references.test.mjs"` — the placeholder test throws ENOENT for slicing.md; the new test fails.

- [ ] **Step 3: Create `references/slicing.md`** with exactly this content:

```markdown
# Slicing — vertical milestones before sizing

Read before proposing milestones (Flow step 3, or companion mode right after
seeding the WBS). Milestones are judgment, not computation: nothing in
`compute.mjs` can tell a good slice from a bad one, so the judgment happens
here, explicitly, before any number is attached.

## The rules

1. **Walking skeleton first.** M1 is the thinnest end-to-end path through the
   architecture — deploy pipeline included. A demo that pushes one record
   through real infrastructure beats a finished layer nobody can click.
2. **Every milestone demos user-visible value.** A milestone whose features
   touch no user-visible component is a horizontal slice — rework it. "All
   schema, then all API, then all UI" is the failure mode, not a plan.
3. **Sequence from dependency direction.** The architecture doc's §5/§6 edges
   decide order: if pricing reads what the ledger records, ledger work
   precedes pricing work. Never invent an order the diagrams contradict.
4. **Balance the slices.** A milestone above ~30% of total effort is a split
   signal; roughly equal slices keep the roadmap's band widths meaningful.
5. **Client priority breaks ties.** When dependencies allow either order, the
   product the client named first ships first.

The component roster makes rule 2 checkable by eye: tag features against the
roster (two levels max, container → component) and scan each milestone's
features for at least one user-visible component.

## Splitting a too-fat milestone

Patterns, in the order to try them (digest of the Humanizing Work guide —
see Sources):

- **Workflow steps** — ship the simple end-to-end case; add middle steps later.
- **Operations** — split "manage X" into create / read / update / delete.
- **Business-rule variations** — one rule per slice.
- **Data variations** — one data shape per slice; defer exotic formats.
- **Data-entry methods** — simplest interface first, rich UI later.
- **Major effort** — pull shared infrastructure into the slice that needs it
  first; later slices lean on it.
- **Simple/complex** — extract the minimal version; defer edge cases.
- **Defer performance** — make it work in one slice, fast in another.
- **Spike** — when uncertainty blocks slicing, time-box an investigation
  feature and size only the spike.

Meta-pattern: find the core complexity, name its variations, cut one complete
slice through the complex part.

## Sources

Attribution + link, never quoted text:

- Story-splitting patterns — Humanizing Work,
  humanizingwork.com/the-humanizing-work-guide-to-splitting-user-stories.
- Dependency-graph-then-vertical-slice process — Addy Osmani,
  planning-and-task-breakdown skill, github.com/addyosmani/agent-skills.
```

- [ ] **Step 4: Run, verify PASS** — same command, all references tests green.

- [ ] **Step 5: Commit**

```bash
git add plugins/solution-architect/skills/estimate/references/slicing.md plugins/solution-architect/skills/estimate/scripts/test/references.test.mjs
git commit -m "docs(estimate): vertical-slice checklist reference"
```

---

### Task 6: Document the components contract

**Files:**
- Modify: `references/writing.md` (§1, after the milestone paragraph at lines 27-30)
- Modify: `SKILL.md` (Flow step 3 at line 28-29; Companion mode at lines 45-54)
- Modify: `README.md` (companion bullet at lines 24-29)
- Test: `scripts/test/references.test.mjs`

**Interfaces:** none — prose only.

- [ ] **Step 1: Write the failing test** — in `scripts/test/references.test.mjs`, extend the needle list of `writing.md states every validator rule family` (lines 43-44) with the two new needles:

```js
  for (const needle of ['not estimated', 'stated', 'proposed', 'Out of scope',
    'assumptions', 'buffer', 'elected', 'docs/estimate/', 'Roadmap', 'not calendar dates',
    'components', 'scope hole']) {
```

- [ ] **Step 2: Run, verify FAIL** — the writing.md test fails on `components`.

- [ ] **Step 3: Implement the three doc edits.**

(a) `references/writing.md` — append this paragraph to §1, directly after the milestone paragraph (line 30):

```markdown
Inputs may also carry a top-level `components` roster (each entry `id`,
`name`, optional `parent` naming a top-level entry — two levels max, C4
container → component — and optional `notEstimated: "<reason>"`). Components
are all-or-nothing like milestones: when the roster exists, every feature
carries a `component` that resolves to a roster id. Every leaf entry must be
covered by at least one feature or carry a `notEstimated` reason —
`schema.mjs` refuses an uncovered component, because a component in the
architecture with no planned work is a scope hole, not an omission to paper
over.
```

(b) `SKILL.md` — Flow step 3 becomes:

```markdown
3. **Interview**: follow `references/interview.md` — pre-fill from evidence,
   ask only holes, run the clear-vs-assumed gate before sizing. Before
   proposing milestones, read `references/slicing.md` — slices are judged
   there, not computed.
```

and add to the Companion mode paragraph, after "…§15 risks seed the risk register,":

```markdown
seed the `components` roster from §6 rows (use the LikeC4 model's container
and component ids where one exists — dotted ids like `atlas.goldStore`) and
tag every feature with the component it implements,
```

(c) `README.md` — in the Companion bullet, after "…the risk register from its §15 Risks," insert:

```markdown
  seeds a `components` roster from §6 so every feature is tagged with the
  component it implements (untouched components are caught by validation),
```

- [ ] **Step 4: Run the full suite, verify PASS**

Run: `node --test "plugins/solution-architect/skills/estimate/scripts/test/*.test.mjs"` — everything green.

- [ ] **Step 5: Commit**

```bash
git add plugins/solution-architect/skills/estimate/references/writing.md plugins/solution-architect/skills/estimate/SKILL.md plugins/solution-architect/skills/estimate/README.md plugins/solution-architect/skills/estimate/scripts/test/references.test.mjs
git commit -m "docs(estimate): document the components contract"
```

---

### Task 7: Real-data verification on Noveon

**Files (all in `~/WIP/CES/Noveon/NoveonProposal/docs/architecture/`, the client deliverable repo — NOT committed there; leave the working tree for the user):**
- Modify: `estimation-inputs.json` (roster + 30 feature tags)
- Regenerate: `estimation.json`, `estimate.html`, `client/estimate.html`

No test files — this is the end-to-end verification pass from the approved plan.

- [ ] **Step 1: Backward-compat proof BEFORE tagging.** From the plugin skill dir, recompute Noveon's untouched inputs to a temp file and diff:

```bash
cd /home/ces-truongvu/WIP/mine/claude-rock/plugins/solution-architect/skills/estimate
node scripts/compute.mjs --inputs ~/WIP/CES/Noveon/NoveonProposal/docs/architecture/estimation-inputs.json --out /tmp/claude-1000/-home-ces-truongvu-WIP-mine-claude-rock/d783ab24-e345-4b7d-a193-5572be308482/scratchpad/noveon-recheck.json
diff ~/WIP/CES/Noveon/NoveonProposal/docs/architecture/estimation.json /tmp/claude-1000/-home-ces-truongvu-WIP-mine-claude-rock/d783ab24-e345-4b7d-a193-5572be308482/scratchpad/noveon-recheck.json
```

Expected: byte-identical (exit 0) — the new field is truly optional. If it differs, STOP: the change broke an existing pipeline and must be fixed before touching real data.

- [ ] **Step 2: Add the roster and tags.** Build the roster from the LikeC4 ids in `~/WIP/CES/Noveon/NoveonProposal/docs/architecture/model/noveon.c4` (containers: `web`, `registry`, `atlas`, `forge`, `relay`, `aegis`, `portfolio`, `david`, `supervisor`, `monitor`; components: `atlas.goldStore`, `atlas.rulesEngine`, `atlas.signals`, `atlas.evidenceResolver`, `forge.pricingEngine`, `forge.bidLedger`, `forge.consentTax`, `forge.dataRoom`, `relay.channels`, `relay.liveCards`, `relay.approvals`, `relay.catchup`, `relay.newsFeed`) plus a `platform` top-level entry for the six `platform-*` features (VPC, Postgres, CI/CD, contract gates, websocket, observability are deploy substrate, not a §6 product component). Tag each of the 30 features: the naming convention maps most 1:1 (`gold-store` → `atlas.goldStore`, `pricing-engine` → `forge.pricingEngine`, …); `web-core`/`web-atlas-surfaces`/`web-forge-surfaces`/`web-relay-surfaces` → `web`; `atlas-shell`/`forge-shell`/`relay-shell` → their containers. Then run compute and read the findings — the coverage rule is EXPECTED to name real holes (at minimum `david`, `supervisor`, `monitor`, likely `portfolio`/`aegis` depending on feature tags). Resolve each one deliberately: tag a feature that genuinely covers it, or add `"notEstimated": "<honest reason>"` (e.g. `david`: "agent plane deferred past this proposal"). Do not blanket-excuse — each reason must be true; check ARCHITECTURE.md §6 rows before writing it.

- [ ] **Step 3: Recompute, validate, re-render both variants**

```bash
cd /home/ces-truongvu/WIP/mine/claude-rock/plugins/solution-architect/skills/estimate
D=~/WIP/CES/Noveon/NoveonProposal/docs/architecture
node scripts/compute.mjs --inputs $D/estimation-inputs.json --out $D/estimation.json
node scripts/validate.mjs --md $D/estimation.md --json $D/estimation.json
node scripts/render.mjs --json $D/estimation.json --md $D/estimation.md --out $D --viewer ../../viewer/index.html
node scripts/render.mjs --json $D/estimation.json --md $D/estimation.md --out $D/client --client-only
```

Expected: validate exits 0 (the md's recompute rule passes because compute reran), both renders print their output paths.

- [ ] **Step 4: CDP-verify on the live server** (serve.mjs from the earlier session is on http://localhost:4173 serving the Noveon repo root; restart with `node plugins/solution-architect/skills/arch-docs/scripts/serve.mjs ~/WIP/CES/Noveon/NoveonProposal` if dead). Verify with `openPage` from `arch-docs/scripts/lib/cdp.mjs`:

- `http://localhost:4173/docs/architecture/estimate.html`: component pills present (`button[data-component]` count = top-level containers with rows + 1), clicking a container pill filters `tr.feat-row` to that container's features, `#containers` table rows match the roster's top-level entries with hours descending, `page.errors` empty.
- `http://localhost:4173/docs/architecture/client/estimate.html`: same section present, `page.errors` empty.

- [ ] **Step 5: Report.** Summarize to the user: which coverage holes the validator caught on real data and how each was resolved, and that the Noveon working tree has regenerated files they may want to commit themselves (this plan does not commit in the client repo).

---

## Verification (whole feature)

1. `node --test "plugins/solution-architect/skills/estimate/scripts/test/*.test.mjs"` — full suite green (schema, compute, validate, render, browser, references, quality-gates).
2. `node --test "plugins/solution-architect/skills/arch-docs/scripts/test/*.test.mjs"` — untouched but shared-lib neighbors; must stay green.
3. Task 7 ran end-to-end on Noveon with 0 console errors and at least one real coverage hole caught and resolved.

## Out of scope

- Roadmap grouped by container (parked option 3).
- Parallel tracks / dependency edges / critical path (parked option 4).
- Any arch-docs viewer change, `checks.mjs` rule, or `redact.mjs` change.
- Commits in the Noveon repo.
