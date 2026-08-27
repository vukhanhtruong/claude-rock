import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadMeasurements } from '../lib/measurements.mjs';
import { percentile, matchBaseline, confidenceFor } from '../lib/baselines.mjs';

const fixturePath = new URL('./fixtures/measurements.jsonl', import.meta.url).pathname;
const records = () => loadMeasurements(fixturePath).records;
const CTX = { agent: 'claude-code', model: 'sonnet', repository: 'project-a' };
const near = (a, b) => assert.ok(Math.abs(a - b) < 0.01, `${a} !~ ${b}`);

test('percentile interpolates linearly', () => {
  const v = [6, 8, 9, 11, 12, 19, 34];
  near(percentile(v, 0.5), 11);
  near(percentile(v, 0.8), 17.6);   // pos 4.8 → 12 + 0.8·(19−12)
  near(percentile(v, 0.95), 29.5);  // pos 5.7 → 19 + 0.7·(34−19)
});

test('rung 1: exact repo+agent+model match wins', () => {
  const stats = matchBaseline(
    { shape: 'cross_file_refactor', scope: { affectedFiles: 8 } },
    { records: records(), agentContext: CTX },
  );
  assert.equal(stats.matchLevel, 1);
  assert.equal(stats.samples, 7);
  near(stats.p50, 11);
  assert.equal(stats.evidence.length, 7);
  assert.deepEqual(stats.evidence[0], { id: 'm01', description: 'Refactor A', minutes: 6 });
});

test('rung 2: different repo falls through to shape+agent', () => {
  const stats = matchBaseline(
    { shape: 'cross_file_refactor', scope: { affectedFiles: 8 } },
    { records: records(), agentContext: { ...CTX, repository: 'other-repo' } },
  );
  assert.equal(stats.matchLevel, 2);
  assert.equal(stats.samples, 7);
});

test('per-task model override matches its own history', () => {
  const stats = matchBaseline(
    { shape: 'planning', scope: {}, model: 'opus' },
    { records: records(), agentContext: { agent: 'claude-code', model: 'sonnet', repository: 'project-b' } },
  );
  assert.equal(stats.samples, 2);   // rung 4: only 2 planning records exist
  assert.equal(stats.matchLevel, 4);
});

test('rung 3: similar scope (±50% affected files) when agent differs', () => {
  const stats = matchBaseline(
    { shape: 'configuration', scope: { affectedFiles: 1 } },
    { records: [...records(), ...records(), ...records()].filter((r) => r.task_shape === 'configuration'),
      agentContext: { agent: 'claude-code', model: 'sonnet', repository: 'project-a' } },
  );
  // 3 copies of the cursor config record: rung 2 fails (agent cursor), rung 3 matches on scope
  assert.equal(stats.matchLevel, 3);
  assert.equal(stats.samples, 3);
});

test('no match at any rung is UNCALIBRATED', () => {
  const stats = matchBaseline(
    { shape: 'database_change', scope: { affectedFiles: 2 } },
    { records: records(), agentContext: CTX },
  );
  assert.deepEqual(stats, { samples: 0, matchLevel: 0, evidence: [] });
  assert.equal(confidenceFor(stats), 'UNCALIBRATED');
});

test('confidence tiers follow the spec table', () => {
  assert.equal(confidenceFor({ samples: 0 }), 'UNCALIBRATED');
  assert.equal(confidenceFor({ samples: 2, p50: 10, p80: 11 }), 'LOW');
  assert.equal(confidenceFor({ samples: 7, p50: 11, p80: 17.6 }), 'MED');
  assert.equal(confidenceFor({ samples: 10, p50: 10, p80: 11.2 }), 'HIGH');
  assert.equal(confidenceFor({ samples: 10, p50: 10, p80: 25 }), 'MED'); // high variance demotes
});
