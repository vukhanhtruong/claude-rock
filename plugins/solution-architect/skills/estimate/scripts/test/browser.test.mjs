import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { findChrome } from '../../../arch-docs/scripts/lib/chrome.mjs';
import { openPage } from '../../../arch-docs/scripts/lib/cdp.mjs';
import { pert, taskHours, scenarioRollup, riskBufferHours, projectBuffer } from '../lib/estimate-math.mjs';

const skip = { skip: !findChrome() && 'no chrome on PATH' };
const fixture = new URL('./fixtures/booking-inputs.json', import.meta.url).pathname;

function buildPage(extra = []) {
  const dir = mkdtempSync(join(tmpdir(), 'estimate-browser-'));
  const scripts = new URL('..', import.meta.url).pathname;
  const passMd = join(scripts, 'test/fixtures/estimation-pass.md');
  execFileSync('node', [join(scripts, 'compute.mjs'), '--inputs', fixture, '--out', join(dir, 'estimation.json')]);
  execFileSync('node', [join(scripts, 'render.mjs'), '--json', join(dir, 'estimation.json'), '--md', passMd, '--out', dir, ...extra]);
  return pathToFileURL(join(dir, 'estimate.html')).href;
}

function nodeRecompute(p) {
  const inputs = JSON.parse(readFileSync(fixture, 'utf8'));
  const tasks = inputs.features.flatMap((f) => f.tasks);
  const hoursOf = (t) => taskHours({ e: pert(t).e, seniority: p.seniority, plan: p.plan,
    category: t.category, verificationPct: inputs.verificationPct, scale: p.aiScale });
  const dev = tasks.reduce((s, t) => s + hoursOf(t), 0);
  const buffers = (riskBufferHours(inputs.risks) + projectBuffer(tasks.map((t) => pert(t).sigma))) * p.bufferScale;
  const hours = dev + dev * p.overheadPct + buffers;
  const team = Array.from({ length: p.engineers }, () => ({ seniority: p.seniority, rate: p.rate }));
  return { hours, ...scenarioRollup({ hours, team, plan: p.plan }) };
}

const PARAMS = { engineers: 2, seniority: 'mid', plan: 'max5x', rate: 45, aiScale: 1, bufferScale: 1, overheadPct: 0.35 };

test('page boots without console errors and browser math equals node math', skip, async () => {
  const page = await openPage(buildPage());
  try {
    const got = await page.eval(`window.__recompute(${JSON.stringify(PARAMS)})`);
    const want = nodeRecompute(PARAMS);
    for (const key of ['hours', 'months', 'totalCost']) {
      assert.ok(Math.abs(got[key] - want[key]) < 1e-6, `${key}: ${got[key]} != ${want[key]}`);
    }
    assert.deepEqual(page.errors, []);
  } finally { page.close(); }
});

test('the scenario cards show only committed scenarios — the rail owns what-if', skip, async () => {
  const page = await openPage(buildPage());
  try {
    const inputs = JSON.parse(readFileSync(fixture, 'utf8'));
    const cards = await page.eval(`[...document.querySelectorAll('#scenario-cards .scenario h3')].map((h) => h.textContent)`);
    assert.deepEqual(cards.sort(), inputs.scenarios.map((s) => s.id).sort());
    const bars = await page.eval(`[...document.querySelectorAll('#cost-bars .bar-label')].map((b) => b.textContent)`);
    assert.ok(!bars.some((b) => b.startsWith('custom')), `custom bar leaked: ${bars}`);
  } finally { page.close(); }
});

test('moving a control updates the custom card and shows the banner', skip, async () => {
  const page = await openPage(buildPage());
  try {
    await page.eval(`(() => {
      const ctl = document.getElementById('ctl-engineers');
      ctl.value = '4'; ctl.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
    assert.equal(await page.eval(`document.getElementById('modified-banner').hidden`), false);
    await page.eval(`document.getElementById('reset').click()`);
    assert.equal(await page.eval(`document.getElementById('modified-banner').hidden`), true);
  } finally { page.close(); }
});

test('every section explains itself: help icons plus a rendered method section', skip, async () => {
  const page = await openPage(buildPage());
  try {
    assert.ok(await page.eval(`document.querySelectorAll('details.help').length >= 6`),
      'expected a help icon per section');
    const method = await page.eval(`document.getElementById('method').textContent`);
    assert.match(method, /three-point-pert/); // technique named from inputs
    assert.match(method, /PERT/);
    assert.match(method, /atomicobject\.com/);
    // open by default: the method explains the page up front; still collapsible
    assert.equal(await page.eval(`document.querySelector('#method details.method-fold').open`), true);
    await page.eval(`document.querySelector('#method details.method-fold summary').click()`);
    assert.equal(await page.eval(`document.querySelector('#method details.method-fold').open`), false);
  } finally { page.close(); }
});

test('the what-if rail shows a live readout that tracks control changes', skip, async () => {
  const page = await openPage(buildPage());
  try {
    const read = () => page.eval(`document.getElementById('whatif-readout').textContent`);
    const before = await read();
    assert.match(before, /months/);
    await page.eval(`(() => {
      const ctl = document.getElementById('ctl-engineers');
      ctl.value = '4'; ctl.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
    assert.notEqual(await read(), before);
  } finally { page.close(); }
});

test('client view hides internals; theme toggle flips the root attribute', skip, async () => {
  const page = await openPage(buildPage());
  try {
    await page.eval(`document.getElementById('view-toggle').click()`);
    assert.equal(await page.eval(
      `getComputedStyle(document.getElementById('controls')).display`), 'none');
    await page.eval(`document.getElementById('theme-toggle').click()`);
    assert.equal(await page.eval(`document.documentElement.dataset.theme`), 'light');
  } finally { page.close(); }
});

test('the --client-only page boots clean without its stripped controls', skip, async () => {
  const page = await openPage(buildPage(['--client-only']));
  try {
    assert.deepEqual(page.errors, []); // stripped nodes must be null-guarded, not assumed
    assert.equal(await page.eval(`document.getElementById('ctl-engineers')`), null);
    for (const id of ['scenario-cards', 'feature-table', 'register', 'method', 'roadmap']) {
      assert.ok(await page.eval(`document.getElementById('${id}').children.length > 0`),
        `${id} empty on client-only page`);
    }
  } finally { page.close(); }
});

test('feature breakdown absorbs the effort chart and the task register', skip, async () => {
  const page = await openPage(buildPage());
  try {
    assert.equal(await page.eval(`document.getElementById('timeline')`), null);
    const names = await page.eval(
      `[...document.querySelectorAll('#feature-table tr.feat-row td:first-child')].map((c) => c.textContent.trim())`);
    assert.equal(names.length, 2);
    assert.match(names[0], /book appointment/); // hours desc by default
    assert.equal(await page.eval(`document.querySelectorAll('#feature-table .bd-fill').length`), 2);
    // per-feature confidence chip is the worst task confidence (booking: HIGH+MED → MED)
    const conf = await page.eval(
      `[...document.querySelectorAll('#feature-table tr.feat-row .conf')].map((c) => c.textContent)`);
    assert.deepEqual(conf, ['MED', 'MED']);
    // the flat task register is gone; the risk register keeps its own section
    const captions = await page.eval(
      `[...document.querySelectorAll('#register caption')].map((c) => c.textContent)`);
    assert.equal(captions.length, 1);
    assert.match(captions[0], /Risk register/);
    assert.deepEqual(page.errors, []);
  } finally { page.close(); }
});

test('breakdown headers sort: effort toggles to ascending on click', skip, async () => {
  const page = await openPage(buildPage());
  try {
    const firstRow = () => page.eval(
      `document.querySelector('#feature-table tr.feat-row td:first-child').textContent.trim()`);
    assert.match(await firstRow(), /book appointment/);
    await page.eval(`document.querySelector('#feature-table th button[data-sort="hours"]').click()`);
    assert.match(await firstRow(), /Email reminders/);
    assert.equal(await page.eval(
      `document.querySelector('#feature-table th button[data-sort="hours"]').closest('th').getAttribute('aria-sort')`),
    'ascending');
  } finally { page.close(); }
});

test('expanding a feature reveals its tasks; client view hides the drill-down', skip, async () => {
  const page = await openPage(buildPage());
  try {
    assert.equal(await page.eval(`document.querySelectorAll('#feature-table tr.task-row').length`), 0);
    await page.eval(`document.querySelector('#feature-table tr.feat-row .expand').click()`);
    const tasks = await page.eval(
      `[...document.querySelectorAll('#feature-table tr.task-row td:first-child')].map((c) => c.textContent.trim())`);
    assert.deepEqual(tasks, ['Booking CRUD API', 'Slot conflict + cancellation rules']);
    await page.eval(`document.getElementById('view-toggle').click()`);
    assert.equal(await page.eval(
      `getComputedStyle(document.querySelector('#feature-table tr.task-row')).display`), 'none');
    assert.equal(await page.eval(
      `getComputedStyle(document.querySelector('#feature-table .expand')).display`), 'none');
  } finally { page.close(); }
});

test('scenario cards carry a month gauge, facts grid, and delta on non-recommended', skip, async () => {
  const page = await openPage(buildPage());
  try {
    assert.equal(await page.eval(
      `document.querySelectorAll('#scenario-cards .scenario .gauge span').length`), 2);
    const widths = await page.eval(
      `[...document.querySelectorAll('#scenario-cards .gauge span')].map((s) => s.style.width)`);
    assert.ok(widths.includes('100%'), `longest scenario must fill its gauge: ${widths}`);
    assert.equal(await page.eval(
      `document.querySelectorAll('#scenario-cards .scenario.recommended .facts dt').length`), 4);
    const facts = await page.eval(
      `[...document.querySelectorAll('#scenario-cards .scenario:not(.recommended) .facts dd')].map((d) => d.textContent)`);
    assert.ok(facts.some((t) => t.includes('2× mid · 1× junior')), `team summary missing: ${facts}`);
    assert.equal(await page.eval(
      `document.querySelectorAll('#scenario-cards .scenario.recommended .delta').length`), 0);
    assert.match(await page.eval(
      `document.querySelector('#scenario-cards .scenario:not(.recommended) .delta').textContent`),
    /mo · [+-]\$[\d,]+ vs recommended/);
  } finally { page.close(); }
});

test('expand all / collapse all toggle every task row and stay internal-only', skip, async () => {
  const page = await openPage(buildPage());
  try {
    await page.eval(`document.querySelector('#feature-table button[data-expand="all"]').click()`);
    assert.equal(await page.eval(`document.querySelectorAll('#feature-table tr.task-row').length`), 3);
    await page.eval(`document.querySelector('#feature-table button[data-expand="none"]').click()`);
    assert.equal(await page.eval(`document.querySelectorAll('#feature-table tr.task-row').length`), 0);
    await page.eval(`document.getElementById('view-toggle').click()`);
    assert.equal(await page.eval(
      `getComputedStyle(document.querySelector('#feature-table button[data-expand="all"]').closest('.bd-filter-group')).display`), 'none');
  } finally { page.close(); }
});

test('the what-if rail is not sticky and lower sections span the full width', skip, async () => {
  const page = await openPage(buildPage());
  try {
    assert.notEqual(await page.eval(
      `getComputedStyle(document.getElementById('controls')).position`), 'sticky');
    const width = (id) => page.eval(
      `document.getElementById('${id}').getBoundingClientRect().width`);
    const narrow = await width('cost-bars');
    for (const id of ['method', 'roadmap', 'feature-table', 'register']) {
      assert.ok(await width(id) > narrow + 100,
        `${id} should outspan the rail-adjacent sections (${await width(id)} vs ${narrow})`);
    }
    // no hole under the cost bars: the left column stretches to the rail's end
    const bottom = (id) => page.eval(
      `document.getElementById('${id}').getBoundingClientRect().bottom`);
    assert.ok(await bottom('cost-bars') >= await bottom('controls') - 1,
      `left column ends above the rail (${await bottom('cost-bars')} vs ${await bottom('controls')})`);
    // the rail panel starts level with the scenario cards, not their heading
    const railTop = await page.eval(
      `document.getElementById('controls').getBoundingClientRect().top`);
    const cardTop = await page.eval(
      `document.querySelector('#scenario-cards .scenario').getBoundingClientRect().top`);
    assert.ok(Math.abs(railTop - cardTop) < 2, `rail top ${railTop} != card top ${cardTop}`);
    // the scenario cards own the tall row; the cost bars stay content-sized
    const height = (id) => page.eval(
      `document.getElementById('${id}').getBoundingClientRect().height`);
    assert.ok(await height('scenario-cards') > await height('cost-bars'),
      'scenario cards should be the taller section');
  } finally { page.close(); }
});

test('milestone and provenance filters scope rows without rescaling bars', skip, async () => {
  const page = await openPage(buildPage());
  try {
    const width = () => page.eval(
      `document.querySelector('#feature-table tr.feat-row[data-id="reminders"] .bd-fill').style.width`);
    const before = await width();
    await page.eval(`document.querySelector('#feature-table button[data-milestone="M2 - Notifications"]').click()`);
    const visible = await page.eval(
      `[...document.querySelectorAll('#feature-table tr.feat-row')].map((r) => r.dataset.id)`);
    assert.deepEqual(visible, ['reminders']);
    assert.equal(await width(), before, 'bar must keep its global scale under filters');
    await page.eval(`document.querySelector('#feature-table button[data-milestone=""]').click()`);
    await page.eval(`document.querySelector('#feature-table button[data-prov="stated"]').click()`);
    assert.deepEqual(await page.eval(
      `[...document.querySelectorAll('#feature-table tr.feat-row')].map((r) => r.dataset.id)`), ['booking']);
  } finally { page.close(); }
});

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

// 150px of label column against milestone names that read "M1 - Foundation: the
// governed write path": every row clips, and a clipped Gantt label names nothing.
// The row carries the full text as its hover title so the axis stays narrow.
test('a clipped roadmap label still names its milestone on hover', skip, async () => {
  const page = await openPage(buildPage());
  try {
    const rows = await page.eval(`[...document.querySelectorAll('#roadmap .roadmap-row')].map((r) => ({
      name: r.querySelector('.roadmap-name').textContent,
      nameTitle: r.querySelector('.roadmap-name').title,
      featTitle: r.querySelector('.roadmap-feature-names').title,
      feats: r.querySelector('.roadmap-feature-names').textContent,
    }))`);
    assert.equal(rows.length, 2);
    for (const row of rows) {
      assert.equal(row.nameTitle, row.name, 'milestone name must carry its own full text');
      assert.equal(row.featTitle, row.feats, 'feature list must carry its own full text');
    }
  } finally { page.close(); }
});

// A page that declares no color-scheme is the page a force-dark browser rewrites,
// and the toggle then flips data-theme with nothing visible changing — the button
// reads as broken. Declared per theme, forced dark is off and the toggle bites.
const READ_THEME = `({
  theme: document.documentElement.dataset.theme || null,
  scheme: getComputedStyle(document.documentElement).colorScheme,
  bg: getComputedStyle(document.body).backgroundColor,
})`;

test('the page opens dark, declares its scheme, and the toggle flips both', skip, async () => {
  const page = await openPage(buildPage());
  try {
    const before = await page.eval(READ_THEME);
    assert.equal(before.theme, 'dark');
    assert.equal(before.scheme, 'dark');
    await page.eval(`document.getElementById('theme-toggle').click()`);
    const after = await page.eval(READ_THEME);
    assert.equal(after.theme, 'light');
    assert.equal(after.scheme, 'light');
    assert.notEqual(after.bg, before.bg, 'the first click must change what the reader sees');
  } finally { page.close(); }
});

// The estimate is a document that gets printed and handed over. A dark screen
// default must not follow it onto paper — that is a full-bleed ink page and grey
// text on it. The dark palette is scoped to screen so paper keeps the light one.
test('the dark default stops at the screen — paper stays light', skip, async () => {
  const page = await openPage(buildPage());
  try {
    const screen = await page.eval(READ_THEME);
    await page.send('Emulation.setEmulatedMedia', { media: 'print' });
    const paper = await page.eval(READ_THEME);
    assert.equal(paper.bg, 'rgb(247, 245, 240)');
    assert.notEqual(paper.bg, screen.bg, 'print must not inherit the dark background');
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
