import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { computeEstimation } from '../lib/rollup.mjs';

const fixturePath = new URL('./fixtures/booking-inputs.json', import.meta.url).pathname;
const fixture = () => JSON.parse(readFileSync(fixturePath, 'utf8'));
const cli = new URL('../compute.mjs', import.meta.url).pathname;

test('golden numbers for the booking fixture', () => {
  const { computed } = computeEstimation(fixture());
  // pert(16,24,40)=25.33/σ4 · pert(24,40,80)=44/σ9.33 · pert(12,20,36)=21.33/σ4
  assert.equal(computed.tasks['booking-api'].e, 25.33);
  assert.equal(computed.tasks['booking-rules'].e, 44);
  assert.equal(computed.tasks['reminder-jobs'].e, 21.33);
  assert.equal(computed.devHours, 90.67);               // round2(152/6 + 44 + 128/6)
  assert.equal(computed.overheadHours, 31.73);          // round2(90.6667 × 0.35)
  assert.equal(computed.spreadBufferHours, 10.91);      // round2(√(4² + 9.3333² + 4²))
  assert.equal(computed.riskBufferHours, 12);           // 0.3 × 40
  assert.equal(computed.projectConfidence, 'MED');      // critical path = booking, worst row MED
  const rec = computed.scenarios['2eng-max5x'];
  assert.ok(rec.months > 0 && rec.totalCost > 0);
  assert.equal(rec.totalCost, rec.laborCost + rec.planCost);
  // AI hours strictly below traditional on every task in an AI scenario
  for (const id of Object.keys(computed.tasks)) {
    assert.ok(rec.taskHours[id] < computed.tasks[id].e);
  }
});

test('CLI writes byte-identical output on repeat runs', () => {
  const dir = mkdtempSync(join(tmpdir(), 'estimate-'));
  const out = join(dir, 'estimation.json');
  execFileSync('node', [cli, '--inputs', fixturePath, '--out', out]);
  const first = readFileSync(out, 'utf8');
  execFileSync('node', [cli, '--inputs', fixturePath, '--out', out]);
  assert.equal(readFileSync(out, 'utf8'), first);
  assert.deepEqual(JSON.parse(first).inputs, fixture()); // inputs echoed verbatim
});

test('CLI refuses invalid inputs, naming findings', () => {
  const dir = mkdtempSync(join(tmpdir(), 'estimate-'));
  const badPath = join(dir, 'bad.json');
  writeFileSync(badPath, JSON.stringify({ ...fixture(), recommendedScenario: 'ghost' }));
  assert.throws(
    () => execFileSync('node', [cli, '--inputs', badPath, '--out', join(dir, 'x.json')], { encoding: 'utf8' }),
    (err) => /recommendedScenario/.test(err.stderr ?? err.stdout ?? String(err)),
  );
});

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

test('no milestones → no roadmap key at all', () => {
  const bare = fixture();
  for (const f of bare.features) delete f.milestone;
  const { computed } = computeEstimation(bare);
  for (const s of Object.values(computed.scenarios)) {
    assert.ok(!('roadmap' in s), 'roadmap key must be absent, not empty');
  }
});
