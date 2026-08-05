import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkInputs } from '../lib/schema.mjs';

const fixture = () => JSON.parse(
  readFileSync(new URL('./fixtures/booking-inputs.json', import.meta.url), 'utf8'));

test('the booking fixture is valid', () => {
  assert.deepEqual(checkInputs(fixture()), []);
});

test('every defect is named with its path', () => {
  const bad = fixture();
  bad.features[0].tasks[0].o = 50;                    // o > m
  bad.features[0].tasks[1].category = 'ai-magic';     // unknown category
  bad.features[1].provenance = 'observed';            // valid vocabulary, but scope must be stated|proposed
  delete bad.features[0].tasks[0].assumptions;        // missing register
  bad.recommendedScenario = 'ghost';                  // not a scenario id
  const findings = checkInputs(bad);
  assert.equal(findings.length, 5);
  assert.ok(findings.some((f) => f.includes('booking-api') && f.includes('o <= m <= p')));
  assert.ok(findings.some((f) => f.includes('booking-rules') && f.includes('category')));
  assert.ok(findings.some((f) => f.includes('reminders') && f.includes('stated|proposed')));
  assert.ok(findings.some((f) => f.includes('booking-api') && f.includes('assumptions')));
  assert.ok(findings.some((f) => f.includes('recommendedScenario')));
});

test('zero estimates are refused — the honest absence is "not estimated"', () => {
  const bad = fixture();
  bad.features[0].tasks[0].m = 0;
  assert.ok(checkInputs(bad).some((f) => f.includes('never 0')));
});

test('anything compute would turn into NaN is refused up front', () => {
  const bad = fixture();
  bad.scenarios[1].plan = 'ghost-plan';
  bad.scenarios[0].team[0].seniority = 'staff';
  bad.scenarios[0].team[1].rate = -5;
  bad.overheadPct = 1.4;
  bad.verificationPct = 'lots';
  bad.risks[0].probability = 7;
  const findings = checkInputs(bad);
  assert.ok(findings.some((f) => f.includes('2eng-max5x') && f.includes('plan')));
  assert.ok(findings.some((f) => f.includes('3eng-noai') && f.includes('seniority')));
  assert.ok(findings.some((f) => f.includes('3eng-noai') && f.includes('rate')));
  assert.ok(findings.some((f) => f.includes('overheadPct')));
  assert.ok(findings.some((f) => f.includes('verificationPct')));
  assert.ok(findings.some((f) => f.includes('probability')));
});

test('a string estimate is refused, not silently coerced by pert()', () => {
  const bad = fixture();
  bad.features[0].tasks[0].o = '16';
  const findings = checkInputs(bad);
  assert.ok(findings.some((f) => f.includes('booking-api') && f.includes('numbers')));
});

test('a feature with no tasks is refused — the zero-spread exemption must not be reachable', () => {
  const bad = fixture();
  bad.features[1].tasks = [];
  const findings = checkInputs(bad);
  assert.ok(findings.some((f) => f.includes('reminders') && f.includes('task')));
});

test('inherited object keys do not pass the enum checks', () => {
  const bad = fixture();
  bad.features[0].tasks[0].category = 'toString';
  bad.scenarios[0].team[0].seniority = 'toString';
  bad.scenarios[1].plan = 'toString';
  const findings = checkInputs(bad);
  assert.ok(findings.some((f) => f.includes('booking-api') && f.includes('category')));
  assert.ok(findings.some((f) => f.includes('3eng-noai') && f.includes('seniority')));
  assert.ok(findings.some((f) => f.includes('2eng-max5x') && f.includes('plan')));
});

test('milestones are all-or-nothing across features', () => {
  const bad = fixture();
  delete bad.features[1].milestone;   // features[0] has one, features[1] doesn't
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
