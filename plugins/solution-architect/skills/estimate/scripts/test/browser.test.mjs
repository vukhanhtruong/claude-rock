import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { findChrome } from '../../../arch-docs/scripts/lib/chrome.mjs';
import { openPage } from '../../../arch-docs/scripts/lib/cdp.mjs';
import { pert, aiAdjust, scenarioRollup, riskBufferHours, projectBuffer } from '../lib/estimate-math.mjs';

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
  const hoursOf = (t) => p.plan === 'none' ? pert(t).e
    : aiAdjust({ e: pert(t).e, category: t.category, seniority: p.seniority,
                 verificationPct: inputs.verificationPct, scale: p.aiScale });
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

test('client view hides internals; theme toggle flips the root attribute', skip, async () => {
  const page = await openPage(buildPage());
  try {
    await page.eval(`document.getElementById('view-toggle').click()`);
    assert.equal(await page.eval(
      `getComputedStyle(document.getElementById('controls')).display`), 'none');
    await page.eval(`document.getElementById('theme-toggle').click()`);
    assert.equal(await page.eval(`document.documentElement.dataset.theme`), 'dark');
  } finally { page.close(); }
});

test('the --client-only page boots clean without its stripped controls', skip, async () => {
  const page = await openPage(buildPage(['--client-only']));
  try {
    assert.deepEqual(page.errors, []); // stripped nodes must be null-guarded, not assumed
    assert.equal(await page.eval(`document.getElementById('ctl-engineers')`), null);
    for (const id of ['scenario-cards', 'timeline', 'register']) {
      assert.ok(await page.eval(`document.getElementById('${id}').children.length > 0`),
        `${id} empty on client-only page`);
    }
  } finally { page.close(); }
});
