import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { checkDeliverables } from '../lib/checks.mjs';
import { computeEstimation } from '../lib/rollup.mjs';

const read = (f) => readFileSync(new URL(`./fixtures/${f}`, import.meta.url), 'utf8');
const inputs = () => JSON.parse(read('booking-inputs.json'));

test('the pass fixture passes', () => {
  assert.deepEqual(
    checkDeliverables({ md: read('estimation-pass.md'), estimation: computeEstimation(inputs()) }), []);
});

test('each seeded violation is caught by name', () => {
  const findings = checkDeliverables({ md: read('estimation-fail.md'), estimation: computeEstimation(inputs()) });
  for (const needle of ['never 0', 'src', 'assumptions cell', 'assumptions register', 'buffer', 'out of scope', 'scenario']) {
    assert.ok(findings.some((f) => f.toLowerCase().includes(needle)), `no finding for: ${needle}`);
  }
});

test('hand-edited totals are refused', () => {
  const est = computeEstimation(inputs());
  est.computed.devHours += 10;
  const findings = checkDeliverables({ md: read('estimation-pass.md'), estimation: est });
  assert.ok(findings.some((f) => f.includes('recomputed')));
});
