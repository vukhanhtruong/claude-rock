import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { AI_CATEGORIES, PLAN_PRICES, TIER_BREAKS } from '../lib/estimate-math.mjs';

const ref = (f) => readFileSync(new URL(`../../references/${f}`, import.meta.url), 'utf8');
const ALL = ['interview.md', 'techniques.md', 'ai-multipliers.md', 'writing.md'];

test('no reference doc carries placeholders', () => {
  for (const f of ALL) assert.doesNotMatch(ref(f), /\bTBD\b|\bTODO\b/, f);
});

test('interview.md carries its five required parts', () => {
  const doc = ref('interview.md');
  for (const needle of ['stated', 'proposed', 'QUICK', 'STANDARD', 'DEEP',
    'confirmed scope', 'impact-if-wrong', 'calibration']) {
    assert.ok(doc.includes(needle), `interview.md missing: ${needle}`);
  }
});

test('techniques.md names every technique and the real tier breaks', () => {
  const doc = ref('techniques.md');
  for (const needle of ['factor-scored tiering', 'three-point PERT', 'analogy']) {
    assert.ok(doc.includes(needle), `techniques.md missing: ${needle}`);
  }
  assert.ok(doc.includes('11-17 M') || doc.includes('11–17 M'), 'tier breaks must match TIER_BREAKS');
  assert.equal(TIER_BREAKS[1].max, 17); // the doc claim above is only honest while this holds
});

test('ai-multipliers.md agrees with the code constants', () => {
  const doc = ref('ai-multipliers.md');
  for (const category of Object.keys(AI_CATEGORIES)) {
    assert.ok(doc.includes(category), `ai-multipliers.md missing category: ${category}`);
  }
  for (const [plan, price] of Object.entries(PLAN_PRICES)) {
    if (plan !== 'none') assert.ok(doc.includes(String(price)), `pricing table missing ${plan}=${price}`);
  }
  assert.match(doc, /blanket/i, 'the blanket-multiplier prohibition must be stated');
});

test('writing.md states every validator rule family', () => {
  const doc = ref('writing.md');
  for (const needle of ['not estimated', 'stated', 'proposed', 'Out of scope',
    'assumptions', 'buffer', 'elected', 'docs/estimate/']) {
    assert.ok(doc.includes(needle), `writing.md missing: ${needle}`);
  }
});
