import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { checkDeliverables } from '../lib/checks.mjs';
import { computeEstimation } from '../lib/rollup.mjs';

const read = (f) => readFileSync(new URL(`./fixtures/${f}`, import.meta.url), 'utf8');
const inputs = () => JSON.parse(read('booking-inputs.json'));
const stripRoadmap = (md) => md.replace(/### Roadmap[\s\S]*?(?=### Assumptions)/, '');

test('the pass fixture passes', () => {
  assert.deepEqual(
    checkDeliverables({ md: read('estimation-pass.md'), estimation: computeEstimation(inputs()) }), []);
});

test('each seeded violation is caught by name', () => {
  const findings = checkDeliverables({ md: read('estimation-fail.md'), estimation: computeEstimation(inputs()) });
  for (const needle of ['never 0', 'src', 'assumptions cell', 'assumptions register', 'buffer', 'out of scope', 'scenario', 'roadmap']) {
    assert.ok(findings.some((f) => f.toLowerCase().includes(needle)), `no finding for: ${needle}`);
  }
});

test('hand-edited totals are refused', () => {
  const est = computeEstimation(inputs());
  est.computed.devHours += 10;
  const findings = checkDeliverables({ md: read('estimation-pass.md'), estimation: est });
  assert.ok(findings.some((f) => f.includes('recomputed')));
});

test('an all-zero feature does not pass via the zero-spread exemption', () => {
  const bad = inputs();
  bad.features.push({ id: 'empty-feat', name: 'Nothing here', provenance: 'stated', tasks: [] });
  const findings = checkDeliverables({ md: read('estimation-pass.md'), estimation: computeEstimation(bad) });
  assert.ok(findings.some((f) => f.includes('empty-feat') && f.includes('low < hours < high')));
});

test('a Summary without a scope table is refused, not vacuously accepted', () => {
  const md = read('estimation-pass.md').replace(
    /\| Feature \| Tier \| Range \(h\) \| src \|\n\| --- \| --- \| --- \| --- \|\n(?:\|.*\|\n)+\n/,
    '',
  );
  const findings = checkDeliverables({ md, estimation: computeEstimation(inputs()) });
  assert.ok(findings.some((f) => f.includes('summary scope table missing')));
});

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
